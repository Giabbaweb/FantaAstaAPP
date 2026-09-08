import {
  describe,
  expect,
  it
} from "vitest";

import {
  buildInitialRosterImportPlan
} from "./initial-roster-import.planner.js";

import type {
  InitialRosterImportParseResult
} from "./player-import.types.js";

describe("buildInitialRosterImportPlan", () => {
  it("matches teams and players and creates import entries", () => {
    const parseResult: InitialRosterImportParseResult = {
      rows: [
        {
          rowNumber: 7,
          teamName: "Abbaweb",
          playerName: "SVILAR Mile",
          role: "P",
          realTeamName: "Roma",
          contractYear: 2,
          acquisitionCost: 14
        },
        {
          rowNumber: 8,
          teamName: "Abbaweb",
          playerName: "COMUZZO Pietro",
          role: "D",
          realTeamName: "Fiorentina",
          contractYear: 1,
          acquisitionCost: 1
        }
      ],
      issues: []
    };

    const result = buildInitialRosterImportPlan(
      parseResult,
      [
        {
          id: "player-svilar",
          fmsCode: "FMS-SVILAR",
          name: "SVILAR Mile",
          realTeamName: "Roma",
          role: "P"
        },
        {
          id: "player-comuzzo",
          fmsCode: "FMS-COMUZZO",
          name: "COMUZZO Pietro",
          realTeamName: "Fiorentina",
          role: "D"
        }
      ],
      [
        {
          auctionSessionTeamId:
            "session-team-abbaweb",
          teamName: "Abbaweb"
        }
      ]
    );

    expect(result.entries).toEqual([
      {
        rowNumber: 7,
        auctionSessionTeamId:
          "session-team-abbaweb",
        playerId: "player-svilar",
        acquisitionCost: 14,
        contractYear: 2,
        source: "INITIAL_ROSTER"
      },
      {
        rowNumber: 8,
        auctionSessionTeamId:
          "session-team-abbaweb",
        playerId: "player-comuzzo",
        acquisitionCost: 1,
        contractYear: 1,
        source: "INITIAL_ROSTER"
      }
    ]);

    expect(result.parserIssues).toEqual([]);
    expect(result.planningIssues).toEqual([]);

    expect(result.summary).toEqual({
      parsedRows: 2,
      validEntries: 2,
      parserIssueCount: 0,
      planningIssueCount: 0
    });
  });

  it("matches normalized player and team names", () => {
    const parseResult: InitialRosterImportParseResult = {
      rows: [
        {
          rowNumber: 12,
          teamName: "  Ábbaweb  ",
          playerName: "BARELLA   Nicolo'",
          role: "C",
          realTeamName: "Inter",
          contractYear: 3,
          acquisitionCost: 25
        }
      ],
      issues: []
    };

    const result = buildInitialRosterImportPlan(
      parseResult,
      [
        {
          id: "player-barella",
          fmsCode: "FMS-BARELLA",
          name: "Barella Nicolo'",
          realTeamName: "INTER",
          role: "C"
        }
      ],
      [
        {
          auctionSessionTeamId:
            "session-team-abbaweb",
          teamName: "Abbaweb"
        }
      ]
    );

    expect(result.entries).toHaveLength(1);
    expect(result.planningIssues).toEqual([]);
  });

  it("skips rows containing parser issues", () => {
    const parseResult: InitialRosterImportParseResult = {
      rows: [
        {
          rowNumber: 7,
          teamName: "All Stars 2005",
          playerName: "LOOKMAN Ademola Olajade",
          role: "A",
          realTeamName: "Atalanta",
          contractYear: 4,
          acquisitionCost: 7
        }
      ],
      issues: [
        {
          rowNumber: 7,
          code: "INVALID_CONTRACT_YEAR",
          message:
            "Contract year must be 1, 2 or 3",
          field: "contractYear",
          rawValue: "4"
        }
      ]
    };

    const result = buildInitialRosterImportPlan(
      parseResult,
      [
        {
          id: "player-lookman",
          fmsCode: "FMS-LOOKMAN",
          name: "LOOKMAN Ademola Olajade",
          realTeamName: "Atalanta",
          role: "A"
        }
      ],
      [
        {
          auctionSessionTeamId:
            "session-team-all-stars",
          teamName: "All Stars 2005"
        }
      ]
    );

    expect(result.entries).toEqual([]);
    expect(result.parserIssues).toHaveLength(1);
    expect(result.planningIssues).toEqual([]);

    expect(result.summary).toEqual({
      parsedRows: 1,
      validEntries: 0,
      parserIssueCount: 1,
      planningIssueCount: 0
    });
  });

  it("reports missing teams and players", () => {
    const parseResult: InitialRosterImportParseResult = {
      rows: [
        {
          rowNumber: 7,
          teamName: "Missing Team",
          playerName: "SVILAR Mile",
          role: "P",
          realTeamName: "Roma",
          contractYear: 2,
          acquisitionCost: 14
        },
        {
          rowNumber: 8,
          teamName: "Abbaweb",
          playerName: "UNKNOWN Player",
          role: "D",
          realTeamName: "Roma",
          contractYear: 1,
          acquisitionCost: 1
        }
      ],
      issues: []
    };

    const result = buildInitialRosterImportPlan(
      parseResult,
      [
        {
          id: "player-svilar",
          fmsCode: "FMS-SVILAR",
          name: "SVILAR Mile",
          realTeamName: "Roma",
          role: "P"
        }
      ],
      [
        {
          auctionSessionTeamId:
            "session-team-abbaweb",
          teamName: "Abbaweb"
        }
      ]
    );

    expect(result.entries).toEqual([]);

    expect(
      result.planningIssues.map(
        (issue) => issue.code
      )
    ).toEqual([
      "TEAM_NOT_FOUND",
      "PLAYER_NOT_FOUND"
    ]);
  });

  it("reports a real-team mismatch", () => {
    const parseResult: InitialRosterImportParseResult = {
      rows: [
        {
          rowNumber: 7,
          teamName: "Abbaweb",
          playerName: "SVILAR Mile",
          role: "P",
          realTeamName: "Milan",
          contractYear: 2,
          acquisitionCost: 14
        }
      ],
      issues: []
    };

    const result = buildInitialRosterImportPlan(
      parseResult,
      [
        {
          id: "player-svilar",
          fmsCode: "FMS-SVILAR",
          name: "SVILAR Mile",
          realTeamName: "Roma",
          role: "P"
        }
      ],
      [
        {
          auctionSessionTeamId:
            "session-team-abbaweb",
          teamName: "Abbaweb"
        }
      ]
    );

    expect(result.entries).toEqual([]);

    expect(
      result.planningIssues.map(
        (issue) => issue.code
      )
    ).toEqual([
      "PLAYER_REAL_TEAM_MISMATCH"
    ]);
  });

  it("reports role mismatches and duplicate players", () => {
    const parseResult: InitialRosterImportParseResult = {
      rows: [
        {
          rowNumber: 7,
          teamName: "Abbaweb",
          playerName: "PULISIC Christian",
          role: "A",
          realTeamName: "Milan",
          contractYear: 2,
          acquisitionCost: 79
        },
        {
          rowNumber: 8,
          teamName: "Abbaweb",
          playerName: "SVILAR Mile",
          role: "P",
          realTeamName: "Roma",
          contractYear: 2,
          acquisitionCost: 14
        },
        {
          rowNumber: 20,
          teamName: "Double Beagles",
          playerName: "SVILAR Mile",
          role: "P",
          realTeamName: "Roma",
          contractYear: 1,
          acquisitionCost: 20
        }
      ],
      issues: []
    };

    const result = buildInitialRosterImportPlan(
      parseResult,
      [
        {
          id: "player-pulisic",
          fmsCode: "FMS-PULISIC",
          name: "PULISIC Christian",
          realTeamName: "Milan",
          role: "C"
        },
        {
          id: "player-svilar",
          fmsCode: "FMS-SVILAR",
          name: "SVILAR Mile",
          realTeamName: "Roma",
          role: "P"
        }
      ],
      [
        {
          auctionSessionTeamId:
            "session-team-abbaweb",
          teamName: "Abbaweb"
        },
        {
          auctionSessionTeamId:
            "session-team-double-beagles",
          teamName: "Double Beagles"
        }
      ]
    );

    expect(result.entries).toEqual([
      {
        rowNumber: 8,
        auctionSessionTeamId:
          "session-team-abbaweb",
        playerId: "player-svilar",
        acquisitionCost: 14,
        contractYear: 2,
        source: "INITIAL_ROSTER"
      }
    ]);

    expect(
      result.planningIssues.map(
        (issue) => issue.code
      )
    ).toEqual([
      "PLAYER_ROLE_MISMATCH",
      "DUPLICATE_PLAYER_IN_IMPORT"
    ]);
  });
});
