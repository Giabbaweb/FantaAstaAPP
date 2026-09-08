import {
  beforeEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionCalls,
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  commandRegistry,
  leagues,
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionEventRepository
} from "../repositories/auction-event.repository.js";
import {
  SqliteAuctionCallRepository
} from "../repositories/auction-call.repository.js";
import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
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
  RosterAssignmentRemovalService
} from "../services/roster-assignment-removal.service.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AtomicRosterAssignmentRemovalCommandExecutor
} from "./atomic-roster-assignment-removal-command.executor.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe(
  "AtomicRosterAssignmentRemovalCommandExecutor",
  () => {
    const leagueId =
      "league-atomic-roster-removal";
    const auctionSessionId =
      "session-atomic-roster-removal";
    const teamId =
      "team-atomic-roster-removal";
    const auctionSessionTeamId =
      "session-team-atomic-roster-removal";
    const playerId =
      "player-atomic-roster-removal";
    const rosterEntryId =
      "roster-entry-atomic-roster-removal";

    let executor:
      AtomicRosterAssignmentRemovalCommandExecutor;

    function createRemovalService() {
      return new RosterAssignmentRemovalService(
        new SqliteAuctionSessionRepository(),
        new SqliteAuctionSessionTeamRepository(),
        new SqliteRosterEntryRepository(),
        new SqlitePlayerRepository()
      );
    }

    beforeEach(() => {
      db.delete(commandRegistry).run();
      db.delete(auctionEvents).run();
      db.delete(auctionCalls).run();
      db.delete(rosterEntries).run();
      db.delete(players).run();
      db.delete(auctionSessionTeams).run();
      db.delete(teams).run();
      db.delete(auctionSessions).run();
      db.delete(leagues).run();

      db.insert(leagues)
        .values({
          id: leagueId,
          name:
            "Atomic Roster Removal League",
          normalizedName:
            "atomic roster removal league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 98,
          status: "SUSPENDED",
          initialCredits: 330,
          stateVersion: 0
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name:
            "Atomic Roster Removal Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id:
            auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 80
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode:
            "ATOMIC-REMOVAL-001",
          name:
            "Atomic Roster Removal Player",
          normalizedName:
            "atomic roster removal player",
          role: "C",
          availabilityStatus:
            "ROSTERED"
        })
        .run();

      db.insert(rosterEntries)
        .values({
          id:
            rosterEntryId,
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 20,
          contractYear: 1,
          source: "AUCTION"
        })
        .run();

      executor =
        new AtomicRosterAssignmentRemovalCommandExecutor(
          new SqliteAuctionSessionStateRepository(),
          new SqliteCommandRegistryRepository(),
          createRemovalService(),
          new SqliteAuctionCallRepository(),
          new SqliteAuctionEventRepository()
        );
    });

    function createInput(
      overrides: Partial<{
        commandId: string;
        expectedStateVersion: number;
        requestFingerprint: string;
      }> = {}
    ) {
      return {
        commandId:
          overrides.commandId ??
          "roster-removal-command-1",
        commandType:
          "REMOVE_ROSTER_ASSIGNMENT" as const,
        expectedStateVersion:
          overrides.expectedStateVersion ?? 0,
        requestFingerprint:
          overrides.requestFingerprint ??
          "roster-removal:entry-1",
        actorName:
          "Gianfranco",
        actorRole:
          "AUCTIONEER" as const,
        comment:
          "Rimossa assegnazione errata",
        removal: {
          auctionSessionId,
          rosterEntryId
        }
      };
    }

    it(
      "rejects roster removal while an operational auction call exists without mutating state",
      async () => {
        db.insert(auctionCalls)
          .values({
            id:
              "operational-call-roster-removal",
            auctionSessionId,
            playerId,
            callerAuctionSessionTeamId:
              auctionSessionTeamId,
            status: "OPEN",
            openingBid: 1,
            currentBid: 1,
            currentLeaderAuctionSessionTeamId:
              auctionSessionTeamId,
            currentTurnAuctionSessionTeamId:
              auctionSessionTeamId
          })
          .run();

        await expect(
          executor.execute(
            createInput()
          )
        ).rejects.toMatchObject({
          code:
            "OPERATIONAL_AUCTION_CALL_EXISTS"
        });

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.id,
              rosterEntryId
            )
          )
          .get();

        expect(storedEntry).toMatchObject({
          id: rosterEntryId,
          acquisitionCost: 20
        });

        const storedTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              auctionSessionTeamId
            )
          )
          .get();

        expect(
          storedTeam?.remainingCredits
        ).toBe(80);

        const storedPlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              playerId
            )
          )
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("ROSTERED");

        const storedSession = db
          .select()
          .from(auctionSessions)
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .get();

        expect(
          storedSession?.stateVersion
        ).toBe(0);

        expect(
          db.select()
            .from(auctionEvents)
            .all()
        ).toHaveLength(0);

        expect(
          db.select()
            .from(commandRegistry)
            .all()
        ).toHaveLength(0);
      }
    );

    it(
      "removes the assignment, refunds credits, records audit and increments stateVersion atomically",
      async () => {
        const result =
          await executor.execute(
            createInput()
          );

        expect(result).toMatchObject({
          stateVersion: 1,
          idempotentReplay: false,
          removal: {
            removed: {
              auctionSessionTeamId,
              playerId,
              acquisitionCost: 20,
              rosterEntry: {
                id: rosterEntryId,
                auctionSessionTeamId,
                playerId,
                acquisitionCost: 20,
                contractYear: 1,
                source: "AUCTION"
              }
            },
            remainingCreditsAfterRemoval: 100
          }
        });

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.id,
              rosterEntryId
            )
          )
          .get();

        expect(storedEntry).toBeUndefined();

        const storedTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              auctionSessionTeamId
            )
          )
          .get();

        expect(
          storedTeam?.remainingCredits
        ).toBe(100);

        const storedPlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              playerId
            )
          )
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("AVAILABLE");

        const storedSession = db
          .select()
          .from(auctionSessions)
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .get();

        expect(
          storedSession?.stateVersion
        ).toBe(1);

        const storedEvents = db
          .select()
          .from(auctionEvents)
          .all();

        expect(storedEvents).toHaveLength(1);

        expect(storedEvents[0]).toMatchObject({
          auctionSessionId,
          eventType:
            "ROSTER_ASSIGNMENT_REMOVED",
          actorName:
            "Gianfranco",
          actorRole:
            "AUCTIONEER",
          comment:
            "Rimossa assegnazione errata",
          beforeAuctionSessionTeamId:
            auctionSessionTeamId,
          beforePlayerId:
            playerId,
          beforeAmount: 20,
          beforeContractYear: 1,
          afterAuctionSessionTeamId: null,
          afterPlayerId: null,
          afterAmount: null,
          afterContractYear: null
        });

        const storedCommand = db
          .select()
          .from(commandRegistry)
          .where(
            eq(
              commandRegistry.commandId,
              "roster-removal-command-1"
            )
          )
          .get();

        expect(storedCommand).toMatchObject({
          auctionSessionId,
          commandScope:
            "AUCTION_SESSION",
          commandType:
            "REMOVE_ROSTER_ASSIGNMENT",
          expectedStateVersion: 0,
          resultStateVersion: 1
        });
      }
    );

    it(
      "returns the original removal for an identical retry",
      async () => {
        const first =
          await executor.execute(
            createInput()
          );

        const retry =
          await executor.execute(
            createInput()
          );

        expect(retry).toEqual({
          ...first,
          idempotentReplay: true
        });

        expect(
          db.select()
            .from(auctionEvents)
            .all()
        ).toHaveLength(1);

        expect(
          db.select()
            .from(commandRegistry)
            .all()
        ).toHaveLength(1);

        const storedTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              auctionSessionTeamId
            )
          )
          .get();

        expect(
          storedTeam?.remainingCredits
        ).toBe(100);

        const storedSession = db
          .select()
          .from(auctionSessions)
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .get();

        expect(
          storedSession?.stateVersion
        ).toBe(1);
      }
    );

    it(
      "rejects reuse of commandId with different data",
      async () => {
        await executor.execute(
          createInput()
        );

        await expect(
          executor.execute(
            createInput({
              requestFingerprint:
                "roster-removal:different"
            })
          )
        ).rejects.toMatchObject({
          code:
            "COMMAND_ID_CONFLICT"
        });
      }
    );

    it(
      "rejects a stale state version without removing the assignment",
      async () => {
        await expect(
          executor.execute(
            createInput({
              expectedStateVersion: 1
            })
          )
        ).rejects.toMatchObject({
          code:
            "STALE_STATE"
        });

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.id,
              rosterEntryId
            )
          )
          .get();

        expect(storedEntry).toMatchObject({
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 20,
          contractYear: 1,
          source: "AUCTION"
        });

        const storedTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              auctionSessionTeamId
            )
          )
          .get();

        expect(
          storedTeam?.remainingCredits
        ).toBe(80);

        const storedPlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              playerId
            )
          )
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("ROSTERED");

        expect(
          db.select()
            .from(auctionEvents)
            .all()
        ).toHaveLength(0);

        expect(
          db.select()
            .from(commandRegistry)
            .all()
        ).toHaveLength(0);

        const storedSession = db
          .select()
          .from(auctionSessions)
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .get();

        expect(
          storedSession?.stateVersion
        ).toBe(0);
      }
    );

    it(
      "rolls back removal, refund, stateVersion and audit when command registration fails",
      async () => {
        class FailingCommandRegistryRepository
          extends SqliteCommandRegistryRepository
        {
          createRosterAssignmentRemovalCommandWithExecutor(): never {
            throw new Error(
              "simulated registry failure"
            );
          }
        }

        const failingExecutor =
          new AtomicRosterAssignmentRemovalCommandExecutor(
            new SqliteAuctionSessionStateRepository(),
            new FailingCommandRegistryRepository(),
            createRemovalService(),
            new SqliteAuctionCallRepository(),
            new SqliteAuctionEventRepository()
          );

        await expect(
          failingExecutor.execute(
            createInput()
          )
        ).rejects.toThrow(
          "simulated registry failure"
        );

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.id,
              rosterEntryId
            )
          )
          .get();

        expect(storedEntry).toMatchObject({
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 20,
          contractYear: 1,
          source: "AUCTION"
        });

        const storedTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              auctionSessionTeamId
            )
          )
          .get();

        expect(
          storedTeam?.remainingCredits
        ).toBe(80);

        const storedPlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              playerId
            )
          )
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("ROSTERED");

        const storedSession = db
          .select()
          .from(auctionSessions)
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .get();

        expect(
          storedSession?.stateVersion
        ).toBe(0);

        expect(
          db.select()
            .from(commandRegistry)
            .all()
        ).toHaveLength(0);

        expect(
          db.select()
            .from(auctionEvents)
            .all()
        ).toHaveLength(0);
      }
    );
  }
);
