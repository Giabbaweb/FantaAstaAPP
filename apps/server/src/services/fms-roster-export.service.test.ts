import type {
  AuctionSession,
  Player,
  RosterEntry
} from "@fantaastaapp/contracts";
import {
  describe,
  expect,
  it
} from "vitest";

import {
  FmsRevoRosterProjectionError
} from "../export/fms-revo-roster.projection.js";
import {
  FmsRevoRosterValidationError
} from "../export/fms-revo-roster.validator.js";
import type {
  AuctionSessionTeamPersistenceRecord
} from "../repositories/auction-session-team.repository.js";
import {
  FmsRosterExportService,
  FmsRosterExportServiceError
} from "./fms-roster-export.service.js";

const createdAt = "2026-08-16T18:00:00.000Z";
const updatedAt = createdAt;

function createAuctionSession(
  overrides: Partial<AuctionSession> = {}
): AuctionSession {
  return {
    id: "session-1",
    leagueId: "league-1",
    season: "2026/2027",
    editionNumber: 35,
    status: "COMPLETED",
    suspensionReason: null,
    initialCredits: 300,
    maximumInitialRosterEntries: 11,
    createdAt,
    updatedAt,
    ...overrides
  };
}

function createAuctionSessionTeam(
  overrides:
    Partial<AuctionSessionTeamPersistenceRecord> = {}
): AuctionSessionTeamPersistenceRecord {
  return {
    id: "session-team-1",
    auctionSessionId: "session-1",
    teamId: "team-1",
    tableOrder: 1,
    renewalCredits: 300,
    remainingCredits: 100,
    ...overrides
  };
}

function createRosterEntry(
  id: string,
  playerId: string
): RosterEntry {
  return {
    id,
    auctionSessionTeamId: "session-team-1",
    playerId,
    acquisitionCost: 1,
    contractYear: 1,
    source: "AUCTION",
    createdAt,
    updatedAt
  };
}

function createPlayer(
  id: string,
  role: Player["role"],
  overrides: Partial<Player> = {}
): Player {
  return {
    id,
    auctionSessionId: "session-1",
    fmsCode: id,
    name: id,
    normalizedName: id,
    realTeamName: "Team",
    role,
    availabilityStatus: "ROSTERED",
    createdAt,
    updatedAt,
    ...overrides
  };
}

function createCompleteRoster(): {
  rosterEntries: RosterEntry[];
  players: Player[];
} {
  const rosterEntries: RosterEntry[] = [];
  const players: Player[] = [];

  const roleCounts: Array<
    [Player["role"], number]
  > = [
    ["P", 2],
    ["D", 8],
    ["C", 8],
    ["A", 6]
  ];

  let index = 1;

  for (const [role, count] of roleCounts) {
    for (
      let roleIndex = 1;
      roleIndex <= count;
      roleIndex += 1
    ) {
      const playerId = `player-${index}`;

      rosterEntries.push(
        createRosterEntry(
          `roster-entry-${index}`,
          playerId
        )
      );

      players.push(
        createPlayer(
          playerId,
          role,
          {
            name:
              `${role}-${roleIndex}`
          }
        )
      );

      index += 1;
    }
  }

  return {
    rosterEntries,
    players
  };
}

function createService(input?: {
  session?: AuctionSession | null;
  sessionTeam?:
    AuctionSessionTeamPersistenceRecord | null;
  rosterEntries?: RosterEntry[];
  players?: Player[];
  exportGoalkeeper?: Player | null;
  exportGoalkeeperPlayerId?: string | null;
}): FmsRosterExportService {
  const completeRoster = createCompleteRoster();

  const defaultExportGoalkeeper =
    createPlayer(
      "player-export-goalkeeper",
      "P",
      {
        name:
          "EXPORT GOALKEEPER",
        realTeamName:
          "Roma",
        availabilityStatus:
          "AVAILABLE"
      }
    );

  return new FmsRosterExportService(
    {
      findByIdWithExecutor: () =>
        input?.session === undefined
          ? createAuctionSession()
          : input.session
    },
    {
      findByIdWithExecutor: () =>
        input?.sessionTeam === undefined
          ? createAuctionSessionTeam()
          : input.sessionTeam,
      updateRemainingCreditsWithExecutor:
        () => null
    },
    {
      findByAuctionSessionTeamIdWithExecutor:
        () =>
          input?.rosterEntries ??
          completeRoster.rosterEntries
    },
    {
      findByIdWithExecutor: (
        _executor,
        playerId
      ) => {
        const exportGoalkeeper =
          input?.exportGoalkeeper === undefined
            ? defaultExportGoalkeeper
            : input.exportGoalkeeper;

        if (
          exportGoalkeeper &&
          exportGoalkeeper.id === playerId
        ) {
          return exportGoalkeeper;
        }

        return (
          input?.players ??
          completeRoster.players
        ).find(
          (player) =>
            player.id === playerId
        ) ?? null;
      },
      findByIdsWithExecutor: () =>
        input?.players ??
        completeRoster.players
    },
    {
      findByAuctionSessionTeamIdWithExecutor:
        () => {
          const playerId =
            input?.exportGoalkeeperPlayerId ===
            undefined
              ? "player-export-goalkeeper"
              : input
                  .exportGoalkeeperPlayerId;

          return playerId
            ? {
                id:
                  "fms-export-goalkeeper-selection-1",
                auctionSessionTeamId:
                  "session-team-1",
                playerId,
                createdAt,
                updatedAt
              }
            : null;
        }
    }
  );
}

describe("FmsRosterExportService", () => {
  it("builds an exportable roster for a completed session", () => {
    const service = createService();

    const result =
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      );

    expect(result).toHaveLength(25);

    expect(result).toContainEqual({
      role: "P",
      name: "EXPORT GOALKEEPER",
      acquisitionCost: 0,
      contractYear: 1
    });
  });

  it("serializes an exportable roster using the FMS format", () => {
    const service = createService();

    const result =
      service.executeSerialized(
        "session-team-1"
      );

    const lines =
      result.split("\n");

    expect(lines).toHaveLength(25);

    expect(lines).toContain(
      "Portiere\tEXPORT GOALKEEPER\t0\t1"
    );

    expect(lines[24]).toBe(
      "Attaccante\tA-6\t1\t1"
    );
  });

  it("rejects export when the FMS goalkeeper was not selected", () => {
    const service = createService({
      exportGoalkeeperPlayerId: null
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      )
    ).toThrowError(
      FmsRosterExportServiceError
    );

    try {
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      );
    } catch (error) {
      expect(
        (
          error as
            FmsRosterExportServiceError
        ).code
      ).toBe(
        "FMS_EXPORT_GOALKEEPER_NOT_SELECTED"
      );
    }
  });

  it("allows export from a closed session", () => {
    const service = createService({
      session: createAuctionSession({
        status: "CLOSED"
      })
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      )
    ).not.toThrow();
  });

  it("rejects export from a non-exportable session status", () => {
    const service = createService({
      session: createAuctionSession({
        status: "RUNNING"
      })
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      )
    ).toThrowError(
      FmsRosterExportServiceError
    );

    try {
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      );
    } catch (error) {
      expect(
        (
          error as
            FmsRosterExportServiceError
        ).code
      ).toBe(
        "AUCTION_SESSION_NOT_EXPORTABLE"
      );
    }
  });

  it("rejects a missing auction session team", () => {
    const service = createService({
      sessionTeam: null
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "missing-session-team"
      )
    ).toThrowError(
      FmsRosterExportServiceError
    );
  });

  it("rejects a missing auction session", () => {
    const service = createService({
      session: null
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      )
    ).toThrowError(
      FmsRosterExportServiceError
    );

    try {
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      );
    } catch (error) {
      expect(
        (
          error as
            FmsRosterExportServiceError
        ).code
      ).toBe("AUCTION_SESSION_NOT_FOUND");
    }
  });

  it("rejects players from another auction session", () => {
    const completeRoster =
      createCompleteRoster();

    const firstPlayer =
      completeRoster.players[0];

    if (!firstPlayer) {
      throw new Error(
        "Expected complete roster to contain players"
      );
    }

    completeRoster.players[0] = {
      ...firstPlayer,
      auctionSessionId: "other-session"
    };

    const service = createService({
      rosterEntries:
        completeRoster.rosterEntries,
      players:
        completeRoster.players
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      )
    ).toThrowError(
      FmsRosterExportServiceError
    );

    try {
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      );
    } catch (error) {
      expect(
        (
          error as
            FmsRosterExportServiceError
        ).code
      ).toBe("PLAYER_SESSION_MISMATCH");
    }
  });

  it("propagates projection errors when a roster player is missing", () => {
    const completeRoster =
      createCompleteRoster();

    const service = createService({
      rosterEntries:
        completeRoster.rosterEntries,
      players:
        completeRoster.players.slice(1)
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      )
    ).toThrowError(
      FmsRevoRosterProjectionError
    );
  });

  it("propagates validation errors for an incomplete roster", () => {
    const completeRoster =
      createCompleteRoster();

    const service = createService({
      rosterEntries:
        completeRoster.rosterEntries.slice(
          0,
          23
        ),
      players:
        completeRoster.players.slice(
          0,
          23
        )
    });

    expect(() =>
      service.executeWithExecutor(
        {} as never,
        "session-team-1"
      )
    ).toThrowError(
      FmsRevoRosterValidationError
    );
  });
});
