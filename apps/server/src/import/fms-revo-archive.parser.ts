import {
  createPlayerSchema
} from "@fantaastaapp/contracts";
import type {
  CreatePlayerInput,
  PlayerAvailabilityStatus,
  PlayerRole
} from "@fantaastaapp/contracts";

import type {
  PlayerImportIssue,
  PlayerImportParseResult,
  PlayerImportSource
} from "./player-import.types.js";

const archiveHeader = [
  "Cod",
  "FMld",
  "Ruolo",
  "Squadra",
  "Nome"
] as const;

const unavailableTeamLabels = new Set([
  "{ELIMINATA}",
  "{SERIE MINORE}",
  "{SERIE ESTERA}"
]);

function trimOuterEmptyCells(
  cells: string[]
): string[] {
  const normalized = [...cells];

  while (
    normalized.length > 0 &&
    normalized[0]?.trim() === ""
  ) {
    normalized.shift();
  }

  while (
    normalized.length > 0 &&
    normalized.at(-1)?.trim() === ""
  ) {
    normalized.pop();
  }

  return normalized.map((cell) => cell.trim());
}

function parseRole(
  rawRole: string
): PlayerRole | null {
  const normalizedRole = rawRole
    .trim()
    .toLocaleLowerCase("it-IT");

  switch (normalizedRole) {
    case "portiere":
      return "P";

    case "difensore":
      return "D";

    case "centrocampista":
      return "C";

    case "attaccante":
      return "A";

    default:
      return null;
  }
}

function getAvailabilityStatus(
  realTeamName: string
): PlayerAvailabilityStatus {
  return unavailableTeamLabels.has(
    realTeamName.trim().toLocaleUpperCase("it-IT")
  )
    ? "UNAVAILABLE"
    : "AVAILABLE";
}

function isArchiveHeader(
  cells: string[]
): boolean {
  return (
    cells.length >= archiveHeader.length &&
    archiveHeader.every(
      (column, index) => cells[index] === column
    )
  );
}

export class FmsRevoArchiveParser {
  parse(
    source: PlayerImportSource
  ): PlayerImportParseResult {
    const players: CreatePlayerInput[] = [];
    const issues: PlayerImportIssue[] = [];

    if (!source.auctionSessionId.trim()) {
      throw new Error(
        "Auction session id is required"
      );
    }

    const lines = source.content.split(/\r?\n/u);

    const headerIndex = lines.findIndex((line) =>
      isArchiveHeader(
        trimOuterEmptyCells(line.split("\t"))
      )
    );

    if (headerIndex < 0) {
      return {
        players,
        issues: [
          {
            rowNumber: 0,
            code: "HEADER_NOT_FOUND",
            message:
              "FMS ReVo archive header was not found"
          }
        ]
      };
    }

    for (
      let lineIndex = headerIndex + 1;
      lineIndex < lines.length;
      lineIndex += 1
    ) {
      const rawLine = lines[lineIndex] ?? "";

      if (!rawLine.trim()) {
        continue;
      }

      const rowNumber = lineIndex + 1;
      const cells = trimOuterEmptyCells(
        rawLine.split("\t")
      );

      if (cells.length < archiveHeader.length) {
        issues.push({
          rowNumber,
          code: "INVALID_COLUMNS",
          message:
            "Archive row does not contain all required columns",
          rawValue: rawLine
        });

        continue;
      }

      const fmsCode = cells[0] ?? "";
      const rawRole = cells[2] ?? "";
      const realTeamName = cells[3] ?? "";
      const name = cells[4] ?? "";

      if (!fmsCode) {
        issues.push({
          rowNumber,
          code: "INVALID_FMS_CODE",
          message: "FMS code is required",
          rawValue: fmsCode
        });

        continue;
      }

      if (!name) {
        issues.push({
          rowNumber,
          code: "INVALID_NAME",
          message: "Player name is required",
          rawValue: name
        });

        continue;
      }

      const role = parseRole(rawRole);

      if (!role) {
        issues.push({
          rowNumber,
          code: "INVALID_ROLE",
          message: `Unsupported player role: ${rawRole}`,
          rawValue: rawRole
        });

        continue;
      }

      const validation = createPlayerSchema.safeParse({
        auctionSessionId:
          source.auctionSessionId.trim(),
        fmsCode,
        name,
        role,
        availabilityStatus:
          getAvailabilityStatus(realTeamName)
      });

      if (!validation.success) {
        issues.push({
          rowNumber,
          code: "INVALID_COLUMNS",
          message: validation.error.issues
            .map((issue) => issue.message)
            .join("; "),
          rawValue: rawLine
        });

        continue;
      }

      players.push(validation.data);
    }

    return {
      players,
      issues
    };
  }
}
