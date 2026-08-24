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
  auctionSessions,
  auctionSessionTeams,
  commandRegistry,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionCallRepository
} from "../repositories/auction-call.repository.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AtomicAuctionCallCreationExecutor
} from "./atomic-auction-call-creation.executor.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe(
  "AtomicAuctionCallCreationExecutor",
  () => {
    const auctionSessionId = "session-create";
    const auctionCallId = "call-create";

    let executor:
      AtomicAuctionCallCreationExecutor;

    beforeEach(async () => {
      executor =
        new AtomicAuctionCallCreationExecutor(
          new SqliteAuctionCallRepository(),
          new SqliteAuctionSessionStateRepository(),
          new SqliteCommandRegistryRepository()
        );

      await db.insert(leagues).values({
        id: "league-create",
        name: "League Create",
        normalizedName: "league create"
      });

      await db.insert(auctionSessions).values({
        id: auctionSessionId,
        leagueId: "league-create",
        season: "2026/2027",
        editionNumber: 99,
        status: "RUNNING",
        initialCredits: 300,
        stateVersion: 0
      });

      for (const order of [1, 2]) {
        await db.insert(teams).values({
          id: `team-${order}`,
          leagueId: "league-create",
          name: `Team ${order}`
        });

        await db
          .insert(auctionSessionTeams)
          .values({
            id: `session-team-${order}`,
            auctionSessionId,
            teamId: `team-${order}`,
            tableOrder: order,
            renewalCredits: 0,
            remainingCredits: 300
          });
      }

      await db.insert(players).values({
        id: "player-create",
        auctionSessionId,
        fmsCode: "100002",
        name: "Player Create",
        normalizedName: "player create",
        role: "A",
        availabilityStatus: "AVAILABLE"
      });
    });

    function createAggregate() {
      return {
        call: {
          id: auctionCallId,
          auctionSessionId,
          playerId: "player-create",
          callerAuctionSessionTeamId:
            "session-team-1",
          status: "DRAFT" as const,
          openingBid: null,
          currentBid: null,
          currentLeaderAuctionSessionTeamId:
            null,
          currentTurnAuctionSessionTeamId:
            null,
          currentTurnStartedAt: null,
          provisionalWinnerAuctionSessionTeamId:
            null,
          createdAt:
            "2026-09-16T19:00:00.000Z",
          updatedAt:
            "2026-09-16T19:00:00.000Z"
        },
        teams: [
          {
            auctionCallId,
            auctionSessionTeamId:
              "session-team-1",
            turnOrder: 1,
            status: "ACTIVE" as const,
            maximumBid: 277,
            exclusionReason: null
          },
          {
            auctionCallId,
            auctionSessionTeamId:
              "session-team-2",
            turnOrder: 2,
            status: "ACTIVE" as const,
            maximumBid: 277,
            exclusionReason: null
          }
        ]
      };
    }

    it(
      "creates the DRAFT, increments stateVersion and registers CREATE atomically",
      async () => {
        const create = vi.fn(
          () => createAggregate()
        );

        const result =
          await executor.execute({
            auctionSessionId,
            auctionCallId,
            commandId:
              "create-command",
            expectedStateVersion: 0,
            requestFingerprint:
              "create:player-create:session-team-1",
            create
          });

        expect(
          result.idempotentReplay
        ).toBe(false);

        expect(result.stateVersion).toBe(1);
        expect(result.aggregate.call).toMatchObject({
          id: auctionCallId,
          status: "DRAFT"
        });

        expect(create).toHaveBeenCalledTimes(1);

        const [session] =
          await db
            .select()
            .from(auctionSessions);

        expect(
          session?.stateVersion
        ).toBe(1);

        const storedCalls =
          await db.select().from(auctionCalls);

        expect(storedCalls).toHaveLength(1);

        const registry =
          await db
            .select()
            .from(commandRegistry);

        expect(registry).toHaveLength(1);
        expect(registry[0]).toMatchObject({
          commandType: "CREATE",
          expectedStateVersion: 0,
          resultStateVersion: 1
        });
      }
    );

    it(
      "returns the original result for an identical retry",
      async () => {
        const create = vi.fn(
          () => createAggregate()
        );

        const input = {
          auctionSessionId,
          auctionCallId,
          commandId:
            "create-replay-command",
          expectedStateVersion: 0,
          requestFingerprint:
            "create:player-create:session-team-1",
          create
        };

        const first =
          await executor.execute(input);

        create.mockClear();

        const replay =
          await executor.execute(input);

        expect(replay).toEqual({
          ...first,
          idempotentReplay: true
        });

        expect(create).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects stale stateVersion",
      async () => {
        await expect(
          executor.execute({
            auctionSessionId,
            auctionCallId,
            commandId:
              "create-stale-command",
            expectedStateVersion: 1,
            requestFingerprint:
              "create:stale",
            create:
              () => createAggregate()
          })
        ).rejects.toMatchObject({
          code: "STALE_STATE"
        });
      }
    );

    it(
      "rejects creation outside RUNNING",
      async () => {
        await db
          .update(auctionSessions)
          .set({
            status: "SUSPENDED"
          });

        await expect(
          executor.execute({
            auctionSessionId,
            auctionCallId,
            commandId:
              "create-suspended-command",
            expectedStateVersion: 0,
            requestFingerprint:
              "create:suspended",
            create:
              () => createAggregate()
          })
        ).rejects.toMatchObject({
          code:
            "AUCTION_SESSION_NOT_RUNNING"
        });
      }
    );

    it(
      "rejects creation when an operational call already exists",
      async () => {
        await db.insert(auctionCalls).values({
          id: "existing-call",
          auctionSessionId,
          playerId: "player-create",
          callerAuctionSessionTeamId:
            "session-team-1",
          status: "DRAFT"
        });

        await expect(
          executor.execute({
            auctionSessionId,
            auctionCallId,
            commandId:
              "create-conflict-command",
            expectedStateVersion: 0,
            requestFingerprint:
              "create:conflict",
            create:
              () => createAggregate()
          })
        ).rejects.toMatchObject({
          code:
            "OPERATIONAL_AUCTION_CALL_ALREADY_EXISTS"
        });
      }
    );

    it(
      "rejects reuse of commandId with different data",
      async () => {
        await executor.execute({
          auctionSessionId,
          auctionCallId,
          commandId:
            "create-id-conflict",
          expectedStateVersion: 0,
          requestFingerprint:
            "create:first",
          create:
            () => createAggregate()
        });

        await expect(
          executor.execute({
            auctionSessionId,
            auctionCallId,
            commandId:
              "create-id-conflict",
            expectedStateVersion: 0,
            requestFingerprint:
              "create:different",
            create:
              () => createAggregate()
          })
        ).rejects.toMatchObject({
          code: "COMMAND_ID_CONFLICT"
        });
      }
    );
  }
);
