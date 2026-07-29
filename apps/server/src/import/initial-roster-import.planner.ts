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

  const playerByNormalizedName = new Map<
    string,
    InitialRosterPlayerLookup
  >();

  for (const player of players) {
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

    const player = playerByNormalizedName.get(
      normalizePlayerName(row.playerName)
    );

    if (!player) {
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

    if (player.role !== row.role) {
      planningIssues.push({
        rowNumber: row.rowNumber,
        code: "PLAYER_ROLE_MISMATCH",
        message:
          `Player role mismatch for ${row.playerName}: ` +
          `archive=${player.role}, roster=${row.role}`,
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
      acquisitionCost: row.acquisitionCost,
      contractYear: row.contractYear as 1 | 2 | 3,
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
      parserIssueCount: parseResult.issues.length,
      planningIssueCount: planningIssues.length
    }
  };
}
