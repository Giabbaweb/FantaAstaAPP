import {
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionCalls,
  auctionSessionTeams,
  auctionSessions,
  leagues,
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionCallRepository
} from "../repositories/auction-call.repository.js";
import {
  SqliteAuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";
import {
  SqlitePlayerRepository
} from "../repositories/player.repository.js";
import {
  SqliteRosterEntryRepository
} from "../repositories/roster-entry.repository.js";
import {
  AtomicAuctionCallCreationExecutor
} from "../realtime/atomic-auction-call-creation.executor.js";
import {
  SqliteAuctionSessionStateRepository
} from "../realtime/auction-session-state.repository.js";
import {
  SqliteCommandRegistryRepository
} from "../realtime/command-registry.repository.js";
import {
  AuctionCallCreationService
} from "./auction-call-creation.service.js";

describe(
  "AuctionCallCreationService",
  () => {
    const auctionSessionId =
      "session-create-service";

    let service:
      AuctionCallCreationService;

    beforeEach(async () => {
      const auctionCallRepository =
        new SqliteAuctionCallRepository();

      service =
        new AuctionCallCreationService(
          new AtomicAuctionCallCreationExecutor(
            auctionCallRepository,
            new SqliteAuctionSessionStateRepository(),
            new SqliteCommandRegistryRepository()
          ),
          new SqliteAuctionSessionTeamRepository(),
          new SqlitePlayerRepository(),
          new SqliteRosterEntryRepository(),
          () =>
            "2026-09-16T19:00:00.000Z"
        );

      await db.insert(leagues).values({
        id: "league-create-service",
        name: "League Create Service",
        normalizedName:
          "league create service"
      });

      await db.insert(auctionSessions).values({
        id: auctionSessionId,
        leagueId:
          "league-create-service",
        season: "2026/2027",
        editionNumber: 35,
        status: "RUNNING",
        initialCredits: 300,
        stateVersion: 0
      });

      for (const order of [1, 2, 3]) {
        await db.insert(teams).values({
          id: `service-team-${order}`,
          leagueId:
            "league-create-service",
          name: `Service Team ${order}`
        });

        await db
          .insert(auctionSessionTeams)
          .values({
            id:
              `service-session-team-${order}`,
            auctionSessionId,
            teamId:
              `service-team-${order}`,
            tableOrder: order,
            renewalCredits: 0,
            remainingCredits:
              order === 2 ? 100 : 300
          });
      }

      await db.insert(players).values({
        id: "service-player-called",
        auctionSessionId,
        fmsCode: "100002",
        name: "Called Player",
        normalizedName:
          "called player",
        role: "A",
        availabilityStatus:
          "AVAILABLE"
      });

      await db.insert(players).values({
        id: "service-roster-a-1",
        auctionSessionId,
        fmsCode: "900001",
        name: "Existing Attacker",
        normalizedName:
          "existing attacker",
        role: "A",
        availabilityStatus:
          "ROSTERED"
      });

      await db.insert(players).values({
        id: "service-roster-c-1",
        auctionSessionId,
        fmsCode: "900002",
        name: "Existing Midfielder",
        normalizedName:
          "existing midfielder",
        role: "C",
        availabilityStatus:
          "ROSTERED"
      });

      await db.insert(rosterEntries).values([
        {
          id: "service-roster-entry-a",
          auctionSessionTeamId:
            "service-session-team-1",
          playerId:
            "service-roster-a-1",
          acquisitionCost: 10,
          contractYear: 1,
          source: "INITIAL_ROSTER"
        },
        {
          id: "service-roster-entry-c",
          auctionSessionTeamId:
            "service-session-team-1",
          playerId:
            "service-roster-c-1",
          acquisitionCost: 8,
          contractYear: 1,
          source: "INITIAL_ROSTER"
        }
      ]);
    });

    it(
      "creates a DRAFT from FMS code and current session data",
      async () => {
        const result =
          await service.createDraft({
            auctionSessionId,
            auctionCallId:
              "service-call-1",
            playerFmsCode: "100002",
            commandId:
              "service-create-command",
            expectedStateVersion: 0
          });

        expect(result).toMatchObject({
          stateVersion: 1,
          idempotentReplay: false,
          aggregate: {
            call: {
              id: "service-call-1",
              auctionSessionId,
              playerId:
                "service-player-called",
              callerAuctionSessionTeamId:
                "service-session-team-1",
              status: "DRAFT"
            }
          }
        });

        expect(
          result.aggregate.teams.map(
            (team) => ({
              id:
                team.auctionSessionTeamId,
              turnOrder:
                team.turnOrder,
              maximumBid:
                team.maximumBid,
              status:
                team.status
            })
          )
        ).toEqual([
          {
            id:
              "service-session-team-1",
            turnOrder: 1,
            maximumBid: 279,
            status: "ACTIVE"
          },
          {
            id:
              "service-session-team-2",
            turnOrder: 2,
            maximumBid: 77,
            status: "ACTIVE"
          },
          {
            id:
              "service-session-team-3",
            turnOrder: 3,
            maximumBid: 277,
            status: "ACTIVE"
          }
        ]);

        const storedCalls =
          await db
            .select()
            .from(auctionCalls);

        expect(storedCalls).toHaveLength(1);
      }
    );

    it(
      "replays an identical CREATE without creating another call",
      async () => {
        const input = {
          auctionSessionId,
          auctionCallId:
            "service-call-replay",
          playerFmsCode: "100002",
          commandId:
            "service-create-replay",
          expectedStateVersion: 0
        };

        const first =
          await service.createDraft(input);

        const replay =
          await service.createDraft(input);

        expect(replay).toEqual({
          ...first,
          idempotentReplay: true
        });

        expect(
          await db
            .select()
            .from(auctionCalls)
        ).toHaveLength(1);
      }
    );

    it(
      "rotates the caller after the latest CONFIRMED call",
      async () => {
        await db.insert(auctionCalls).values({
          id:
            "service-call-previous-confirmed",
          auctionSessionId,
          playerId:
            "service-roster-a-1",
          callerAuctionSessionTeamId:
            "service-session-team-1",
          status: "CONFIRMED"
        });

        const result =
          await service.createDraft({
            auctionSessionId,
            auctionCallId:
              "service-call-after-confirmed",
            playerFmsCode: "100002",
            commandId:
              "service-create-after-confirmed",
            expectedStateVersion: 0
          });

        expect(
          result.aggregate.call
            .callerAuctionSessionTeamId
        ).toBe(
          "service-session-team-2"
        );
      }
    );

    it(
      "wraps caller rotation after the last table position",
      async () => {
        await db.insert(auctionCalls).values({
          id:
            "service-call-previous-last",
          auctionSessionId,
          playerId:
            "service-roster-a-1",
          callerAuctionSessionTeamId:
            "service-session-team-3",
          status: "CONFIRMED"
        });

        const result =
          await service.createDraft({
            auctionSessionId,
            auctionCallId:
              "service-call-after-last",
            playerFmsCode: "100002",
            commandId:
              "service-create-after-last",
            expectedStateVersion: 0
          });

        expect(
          result.aggregate.call
            .callerAuctionSessionTeamId
        ).toBe(
          "service-session-team-1"
        );
      }
    );

    it(
      "does not consume caller rotation for a CANCELLED call",
      async () => {
        await db.insert(auctionCalls).values([
          {
            id:
              "service-call-confirmed-before-cancel",
            auctionSessionId,
            playerId:
              "service-roster-a-1",
            callerAuctionSessionTeamId:
              "service-session-team-1",
            status: "CONFIRMED",
            createdAt:
              "2026-09-16T19:00:00.000Z",
            updatedAt:
              "2026-09-16T19:00:00.000Z"
          },
          {
            id:
              "service-call-cancelled",
            auctionSessionId,
            playerId:
              "service-roster-c-1",
            callerAuctionSessionTeamId:
              "service-session-team-2",
            status: "CANCELLED",
            createdAt:
              "2026-09-16T19:01:00.000Z",
            updatedAt:
              "2026-09-16T19:01:00.000Z"
          }
        ]);

        const result =
          await service.createDraft({
            auctionSessionId,
            auctionCallId:
              "service-call-after-cancel",
            playerFmsCode: "100002",
            commandId:
              "service-create-after-cancel",
            expectedStateVersion: 0
          });

        expect(
          result.aggregate.call
            .callerAuctionSessionTeamId
        ).toBe(
          "service-session-team-2"
        );
      }
    );

    it(
      "rejects a missing FMS player",
      async () => {
        await expect(
          service.createDraft({
            auctionSessionId,
            auctionCallId:
              "service-call-missing-player",
            playerFmsCode:
              "DOES-NOT-EXIST",
            commandId:
              "service-create-missing-player",
            expectedStateVersion: 0
          })
        ).rejects.toMatchObject({
          code: "PLAYER_NOT_FOUND"
        });
      }
    );

    it(
      "rejects a non-available player",
      async () => {
        await db
          .update(players)
          .set({
            availabilityStatus:
              "ROSTERED"
          })
          .where(
            (
              await import("drizzle-orm")
            ).eq(
              players.id,
              "service-player-called"
            )
          );

        await expect(
          service.createDraft({
            auctionSessionId,
            auctionCallId:
              "service-call-assigned",
            playerFmsCode: "100002",
            commandId:
              "service-create-assigned",
            expectedStateVersion: 0
          })
        ).rejects.toMatchObject({
          code: "PLAYER_NOT_AVAILABLE"
        });
      }
    );

  }
);
