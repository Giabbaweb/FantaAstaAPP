import type {
  PlayerRole
} from "@fantaastaapp/contracts";

import type {
  InitialRosterImportIssue,
  InitialRosterImportParseResult,
  InitialRosterImportRow,
  PlayerImportSource
} from "./player-import.types.js";

const rosterHeader = [
  "Ruolo",
  "Nome",
  "Squadra",
  "Con",
  "$Acq"
] as const;

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

function isRosterHeader(
  cells: string[]
): boolean {
  return (
    cells.length >= rosterHeader.length &&
    rosterHeader.every(
      (column, index) => cells[index] === column
    )
  );
}

function parseRole(
  rawRole: string
): PlayerRole | null {
  switch (
    rawRole.trim().toLocaleLowerCase("it-IT")
  ) {
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

function parseInteger(
  rawValue: string
): number | null {
  const normalized = rawValue.trim();

  if (!/^-?\d+$/u.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  return Number.isSafeInteger(value)
    ? value
    : null;
}

function findTeamName(
  lines: string[],
  headerIndex: number
): string | null {
  for (
    let lineIndex = headerIndex - 1;
    lineIndex >= 0;
    lineIndex -= 1
  ) {
    const cells = trimOuterEmptyCells(
      (lines[lineIndex] ?? "").split("\t")
    );

    if (cells.length === 0) {
      continue;
    }

    const firstCell = cells[0] ?? "";

    if (
      firstCell === "Rosa Giocatori" ||
      firstCell.startsWith("E-mail:") ||
      firstCell.startsWith("Presidente ")
    ) {
      continue;
    }

    return firstCell;
  }

  return null;
}

function isRosterEnd(
  cells: string[]
): boolean {
  return (
    cells.length === 0 ||
    cells[0] === "Bilancio" ||
    cells[0] === "Descrizione"
  );
}

export class FmsRevoRostersParser {
  parse(
    source: PlayerImportSource
  ): InitialRosterImportParseResult {
    if (!source.auctionSessionId.trim()) {
      throw new Error(
        "Auction session id is required"
      );
    }

    const rows: InitialRosterImportRow[] = [];
    const issues: InitialRosterImportIssue[] = [];
    const lines = source.content.split(/\r?\n/u);

    const headerIndexes = lines
      .map((line, index) => ({
        index,
        cells: trimOuterEmptyCells(
          line.split("\t")
        )
      }))
      .filter(({ cells }) =>
        isRosterHeader(cells)
      )
      .map(({ index }) => index);

    if (headerIndexes.length === 0) {
      return {
        rows,
        issues: [
          {
            rowNumber: 0,
            code: "ROSTER_HEADER_NOT_FOUND",
            message:
              "FMS ReVo roster header was not found"
          }
        ]
      };
    }

    for (const headerIndex of headerIndexes) {
      const teamName = findTeamName(
        lines,
        headerIndex
      );

      if (!teamName) {
        issues.push({
          rowNumber: headerIndex + 1,
          code: "TEAM_NAME_NOT_FOUND",
          message:
            "Fantasy team name was not found before roster header",
          field: "teamName"
        });
      }

      for (
        let lineIndex = headerIndex + 1;
        lineIndex < lines.length;
        lineIndex += 1
      ) {
        const rawLine = lines[lineIndex] ?? "";

        if (!rawLine.trim()) {
          break;
        }

        const cells = trimOuterEmptyCells(
          rawLine.split("\t")
        );

        if (isRosterEnd(cells)) {
          break;
        }

        const rowNumber = lineIndex + 1;

        if (cells.length < rosterHeader.length) {
          issues.push({
            rowNumber,
            code: "INVALID_ROSTER_COLUMNS",
            message:
              "Roster row does not contain all required columns",
            rawValue: rawLine
          });

          continue;
        }

        const rawRole = cells[0] ?? "";
        const playerName = cells[1] ?? "";
        const realTeamName = cells[2] ?? "";
        const rawContractYear = cells[3] ?? "";
        const rawAcquisitionCost = cells[4] ?? "";

        const role = parseRole(rawRole);
        const contractYear = parseInteger(
          rawContractYear
        );
        const acquisitionCost = parseInteger(
          rawAcquisitionCost
        );

        if (!playerName) {
          issues.push({
            rowNumber,
            code: "INVALID_PLAYER_NAME",
            message: "Player name is required",
            field: "playerName",
            rawValue: playerName
          });
        }

        if (!role) {
          issues.push({
            rowNumber,
            code: "INVALID_ROLE",
            message:
              `Unsupported player role: ${rawRole}`,
            field: "role",
            rawValue: rawRole
          });
        }

        if (
          contractYear === null ||
          contractYear < 1 ||
          contractYear > 3
        ) {
          issues.push({
            rowNumber,
            code: "INVALID_CONTRACT_YEAR",
            message:
              "Contract year must be 1, 2 or 3",
            field: "contractYear",
            rawValue: rawContractYear
          });
        }

        if (
          acquisitionCost === null ||
          acquisitionCost < 1
        ) {
          issues.push({
            rowNumber,
            code: "INVALID_ACQUISITION_COST",
            message:
              "Acquisition cost must be a positive integer",
            field: "acquisitionCost",
            rawValue: rawAcquisitionCost
          });
        }

        rows.push({
          rowNumber,
          teamName: teamName ?? "",
          playerName,
          role,
          realTeamName,
          contractYear,
          acquisitionCost
        });
      }
    }

    return {
      rows,
      issues
    };
  }
}
