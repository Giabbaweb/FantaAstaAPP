import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  db
} from "../db/client.js";

import {
  auctionCalls,
  auctionCallTeams,
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  leagues,
  players,
  teams
} from "../db/schema/index.js";

import {
  SqliteAuctionEventRepository
} from "../repositories/auction-event.repository.js";

import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";

import {
  SqliteAuctionSessionStateRepository
} from "../realtime/auction-session-state.repository.js";

import {
  StartupRecoveryService
} from "./startup-recovery.service.js";

const leagueId =
  "league-startup-recovery-test";

const runningSessionId =
  "session-startup-recovery-running";

const suspendedSessionId =
  "session-startup-recovery-suspended";

beforeEach(() => {
  db.delete(auctionEvents).run();
  db.delete(auctionSessions).run();
  db.delete(leagues).run();

  db.insert(leagues)
    .values({
      id: leagueId,
      name: "Startup Recovery League",
      normalizedName:
        "startup recovery league"
    })
    .run();
});

describe(
  "StartupRecoveryService",
  () => {
    it(
      "suspends a RUNNING session with RECOVERY_RESTART and persists audit",
      async () => {
        db.insert(auctionSessions)
          .values({
            id: runningSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 1,
            status: "RUNNING",
            suspensionReason: null,
            initialCredits: 300,
            stateVersion: 7
          })
          .run();

        const createRecoveryPoint =
          vi.fn(
            async () => ({})
          );

        const service =
          new StartupRecoveryService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionStateRepository(),
            new SqliteAuctionEventRepository(),
            {
              createRecoveryPoint
            }
          );

        const result =
          await service.run();

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions);

        expect(storedSession).toMatchObject({
          id: runningSessionId,
          status: "SUSPENDED",
          suspensionReason:
            "RECOVERY_RESTART",
          stateVersion: 8
        });

        const storedEvents =
          await db
            .select()
            .from(auctionEvents);

        expect(storedEvents).toHaveLength(1);

        expect(
          storedEvents[0]
        ).toMatchObject({
          auctionSessionId:
            runningSessionId,
          eventType:
            "SESSION_SUSPENDED",
          suspensionReason:
            "RECOVERY_RESTART"
        });

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledTimes(1);

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledWith({
          auctionSessionId:
            runningSessionId,
          reason:
            "RECOVERY_RESTART"
        });

        expect(result).toEqual({
          recoveredSessions: [
            {
              auctionSessionId:
                runningSessionId,
              previousStateVersion: 7,
              recoveredStateVersion: 8,
              backupSucceeded: true
            }
          ]
        });
      }
    );

    it(
      "leaves an already SUSPENDED session unchanged without audit or backup",
      async () => {
        db.insert(auctionSessions)
          .values({
            id: suspendedSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 2,
            status: "SUSPENDED",
            suspensionReason:
              "PIZZA_BREAK",
            initialCredits: 300,
            stateVersion: 11
          })
          .run();

        const createRecoveryPoint =
          vi.fn(
            async () => ({})
          );

        const service =
          new StartupRecoveryService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionStateRepository(),
            new SqliteAuctionEventRepository(),
            {
              createRecoveryPoint
            }
          );

        const result =
          await service.run();

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions);

        expect(storedSession).toMatchObject({
          id: suspendedSessionId,
          status: "SUSPENDED",
          suspensionReason:
            "PIZZA_BREAK",
          stateVersion: 11
        });

        const storedEvents =
          await db
            .select()
            .from(auctionEvents);

        expect(storedEvents).toHaveLength(0);

        expect(
          createRecoveryPoint
        ).not.toHaveBeenCalled();

        expect(result).toEqual({
          recoveredSessions: []
        });
      }
    );

    it(
      "keeps the committed recovery transition when the post-commit backup fails",
      async () => {
        db.insert(auctionSessions)
          .values({
            id: runningSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 3,
            status: "RUNNING",
            suspensionReason: null,
            initialCredits: 300,
            stateVersion: 20
          })
          .run();

        const backupError =
          new Error("backup failed");

        const service =
          new StartupRecoveryService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionStateRepository(),
            new SqliteAuctionEventRepository(),
            {
              createRecoveryPoint:
                vi.fn(
                  async () => {
                    throw backupError;
                  }
                )
            }
          );

        const result =
          await service.run();

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions);

        expect(storedSession).toMatchObject({
          id: runningSessionId,
          status: "SUSPENDED",
          suspensionReason:
            "RECOVERY_RESTART",
          stateVersion: 21
        });

        const storedEvents =
          await db
            .select()
            .from(auctionEvents);

        expect(storedEvents).toHaveLength(1);

        expect(
          result.recoveredSessions
        ).toHaveLength(1);

        expect(
          result.recoveredSessions[0]
        ).toMatchObject({
          auctionSessionId:
            runningSessionId,
          previousStateVersion: 20,
          recoveredStateVersion: 21,
          backupSucceeded: false,
          backupError
        });
      }
    );

    it(
      "preserves an active auction call exactly while recovering its RUNNING session",
      async () => {
        const teamAId =
          "team-startup-recovery-a";
        const teamBId =
          "team-startup-recovery-b";
        const teamCId =
          "team-startup-recovery-c";

        const sessionTeamAId =
          "session-team-startup-recovery-a";
        const sessionTeamBId =
          "session-team-startup-recovery-b";
        const sessionTeamCId =
          "session-team-startup-recovery-c";

        const playerId =
          "player-startup-recovery";

        const auctionCallId =
          "call-startup-recovery";

        db.insert(auctionSessions)
          .values({
            id: runningSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 4,
            status: "RUNNING",
            suspensionReason: null,
            initialCredits: 300,
            stateVersion: 30
          })
          .run();

        db.insert(teams)
          .values([
            {
              id: teamAId,
              leagueId,
              name: "Recovery Team A"
            },
            {
              id: teamBId,
              leagueId,
              name: "Recovery Team B"
            },
            {
              id: teamCId,
              leagueId,
              name: "Recovery Team C"
            }
          ])
          .run();

        db.insert(auctionSessionTeams)
          .values([
            {
              id: sessionTeamAId,
              auctionSessionId:
                runningSessionId,
              teamId: teamAId,
              tableOrder: 1,
              remainingCredits: 250
            },
            {
              id: sessionTeamBId,
              auctionSessionId:
                runningSessionId,
              teamId: teamBId,
              tableOrder: 2,
              remainingCredits: 240
            },
            {
              id: sessionTeamCId,
              auctionSessionId:
                runningSessionId,
              teamId: teamCId,
              tableOrder: 3,
              remainingCredits: 230
            }
          ])
          .run();

        db.insert(players)
          .values({
            id: playerId,
            auctionSessionId:
              runningSessionId,
            fmsCode: "RECOVERY-001",
            name: "Recovery Test Player",
            normalizedName:
              "recovery test player",
            role: "A",
            availabilityStatus:
              "AVAILABLE"
          })
          .run();

        db.insert(auctionCalls)
          .values({
            id: auctionCallId,
            auctionSessionId:
              runningSessionId,
            playerId,
            callerAuctionSessionTeamId:
              sessionTeamAId,
            status: "OPEN",
            openingBid: 1,
            currentBid: 27,
            currentLeaderAuctionSessionTeamId:
              sessionTeamAId,
            currentTurnAuctionSessionTeamId:
              sessionTeamBId,
            provisionalWinnerAuctionSessionTeamId:
              null
          })
          .run();

        db.insert(auctionCallTeams)
          .values([
            {
              id:
                "call-team-startup-recovery-a",
              auctionCallId,
              auctionSessionTeamId:
                sessionTeamAId,
              status: "ACTIVE",
              maximumBid: 250,
              exclusionReason: null
            },
            {
              id:
                "call-team-startup-recovery-b",
              auctionCallId,
              auctionSessionTeamId:
                sessionTeamBId,
              status: "ACTIVE",
              maximumBid: 240,
              exclusionReason: null
            },
            {
              id:
                "call-team-startup-recovery-c",
              auctionCallId,
              auctionSessionTeamId:
                sessionTeamCId,
              status: "PASSED",
              maximumBid: 230,
              exclusionReason: null
            }
          ])
          .run();

        const callBefore =
          await db
            .select()
            .from(auctionCalls);

        const callTeamsBefore =
          await db
            .select()
            .from(auctionCallTeams);

        const service =
          new StartupRecoveryService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionStateRepository(),
            new SqliteAuctionEventRepository(),
            {
              createRecoveryPoint:
                vi.fn(
                  async () => ({})
                )
            }
          );

        await service.run();

        const callAfter =
          await db
            .select()
            .from(auctionCalls);

        const callTeamsAfter =
          await db
            .select()
            .from(auctionCallTeams);

        expect(callAfter).toEqual(
          callBefore
        );

        expect(callTeamsAfter).toEqual(
          callTeamsBefore
        );

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions);

        expect(storedSession).toMatchObject({
          id: runningSessionId,
          status: "SUSPENDED",
          suspensionReason:
            "RECOVERY_RESTART",
          stateVersion: 31
        });
      }
    );

    it.each([
      "SETUP",
      "READY",
      "COMPLETED",
      "CLOSED"
    ] as const)(
      "leaves %s sessions unchanged",
      async (status) => {
        db.insert(auctionSessions)
          .values({
            id:
              `session-startup-${status}`,
            leagueId,
            season:
              `season-${status}`,
            editionNumber:
              status === "SETUP"
                ? 10
                : status === "READY"
                  ? 11
                  : status === "COMPLETED"
                    ? 12
                    : 13,
            status,
            suspensionReason: null,
            initialCredits: 300,
            stateVersion: 4
          })
          .run();

        const createRecoveryPoint =
          vi.fn(
            async () => ({})
          );

        const service =
          new StartupRecoveryService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionStateRepository(),
            new SqliteAuctionEventRepository(),
            {
              createRecoveryPoint
            }
          );

        const result =
          await service.run();

        const [storedSession] =
          await db
            .select()
            .from(auctionSessions);

        expect(storedSession).toMatchObject({
          status,
          stateVersion: 4,
          suspensionReason: null
        });

        expect(
          createRecoveryPoint
        ).not.toHaveBeenCalled();

        expect(result).toEqual({
          recoveredSessions: []
        });
      }
    );
  }
);
