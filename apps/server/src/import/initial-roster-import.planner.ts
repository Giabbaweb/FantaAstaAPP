import {
  normalizePlayerName
} from "@fantaastaapp/domain";

import type {
  InitialRosterImportParseResult,
  InitialRosterImportPlan,
  InitialRosterImportPlanEntry,
  InitialRosterImportPlanIssue,
  InitialRosterPlayerLookup,
  InitialRosterTeamLookup
} from "./player-import.types.js";

function normalizeTeamName(
  value: string
): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("it-IT");
}

function normalizeRealTeamName(
  value: string | null
): string {
  return normalizeTeamName(
    value ?? ""
  );
}

function buildPlayerIdentityKey(
  name: string,
  role: InitialRosterPlayerLookup["role"],
  realTeamName: string | null
): string {
  return [
    normalizePlayerName(name),
    role,
    normalizeRealTeamName(realTeamName)
  ].join("|");
}

function hasParserIssueForRow(
  result: InitialRosterImportParseResult,
  rowNumber: number
): boolean {
  return result.issues.some(
    (issue) => issue.rowNumber === rowNumber
  );
}

export function buildInitialRosterImportPlan(
  parseResult: InitialRosterImportParseResult,
  players: InitialRosterPlayerLookup[],
  teams: InitialRosterTeamLookup[]
): InitialRosterImportPlan {
  const entries: InitialRosterImportPlanEntry[] = [];
  const planningIssues: InitialRosterImportPlanIssue[] = [];

  const playerByIdentity = new Map<
    string,
    InitialRosterPlayerLookup
  >();

  const playerByNormalizedName = new Map<
    string,
    InitialRosterPlayerLookup
  >();

  for (const player of players) {
    playerByIdentity.set(
      buildPlayerIdentityKey(
        player.name,
        player.role,
        player.realTeamName
      ),
      player
    );

    playerByNormalizedName.set(
      normalizePlayerName(player.name),
      player
    );
  }

  const teamByNormalizedName = new Map<
    string,
    InitialRosterTeamLookup
  >();

  for (const team of teams) {
    teamByNormalizedName.set(
      normalizeTeamName(team.teamName),
      team
    );
  }

  const importedPlayerIds = new Set<string>();

  for (const row of parseResult.rows) {
    if (
      hasParserIssueForRow(
        parseResult,
        row.rowNumber
      )
    ) {
      continue;
    }

    if (
      row.role === null ||
      row.contractYear === null ||
      row.acquisitionCost === null
    ) {
      continue;
    }

    const team = teamByNormalizedName.get(
      normalizeTeamName(row.teamName)
    );

    if (!team) {
      planningIssues.push({
        rowNumber: row.rowNumber,
        code: "TEAM_NOT_FOUND",
        message:
          `Fantasy team was not found: ${row.teamName}`,
        teamName: row.teamName,
        playerName: row.playerName
      });

      continue;
    }

    const playerIdentityKey =
      buildPlayerIdentityKey(
        row.playerName,
        row.role,
        row.realTeamName
      );

    const player =
      playerByIdentity.get(
        playerIdentityKey
      );

    if (!player) {
      const playerByName =
        playerByNormalizedName.get(
          normalizePlayerName(
            row.playerName
          )
        );

      if (!playerByName) {
        planningIssues.push({
          rowNumber: row.rowNumber,
          code: "PLAYER_NOT_FOUND",
          message:
            `Player was not found: ${row.playerName}`,
          teamName: row.teamName,
          playerName: row.playerName
        });

        continue;
      }

      if (playerByName.role !== row.role) {
        planningIssues.push({
          rowNumber: row.rowNumber,
          code: "PLAYER_ROLE_MISMATCH",
          message:
            `Player role mismatch for ${row.playerName}: ` +
            `archive=${playerByName.role}, roster=${row.role}`,
          teamName: row.teamName,
          playerName: row.playerName
        });

        continue;
      }

      if (
        normalizeRealTeamName(
          playerByName.realTeamName
        ) !==
        normalizeRealTeamName(
          row.realTeamName
        )
      ) {
        planningIssues.push({
          rowNumber: row.rowNumber,
          code:
            "PLAYER_REAL_TEAM_MISMATCH",
          message:
            `Player real team mismatch for ${row.playerName}: ` +
            `archive=${playerByName.realTeamName ?? ""}, ` +
            `roster=${row.realTeamName}`,
          teamName: row.teamName,
          playerName: row.playerName
        });

        continue;
      }

      planningIssues.push({
        rowNumber: row.rowNumber,
        code: "PLAYER_NOT_FOUND",
        message:
          `Player was not found: ${row.playerName}`,
        teamName: row.teamName,
        playerName: row.playerName
      });

      continue;
    }

    if (importedPlayerIds.has(player.id)) {
      planningIssues.push({
        rowNumber: row.rowNumber,
        code: "DUPLICATE_PLAYER_IN_IMPORT",
        message:
          `Player appears more than once in the roster import: ` +
          row.playerName,
        teamName: row.teamName,
        playerName: row.playerName
      });

      continue;
    }

    importedPlayerIds.add(player.id);

    entries.push({
      rowNumber: row.rowNumber,
      auctionSessionTeamId:
        team.auctionSessionTeamId,
      playerId: player.id,
      acquisitionCost:
        row.acquisitionCost,
      contractYear:
        row.contractYear as 1 | 2 | 3,
      source: "INITIAL_ROSTER"
    });
  }

  return {
    entries,
    parserIssues: parseResult.issues,
    planningIssues,
    summary: {
      parsedRows: parseResult.rows.length,
      validEntries: entries.length,
      parserIssueCount:
        parseResult.issues.length,
      planningIssueCount:
        planningIssues.length
    }
  };
}
