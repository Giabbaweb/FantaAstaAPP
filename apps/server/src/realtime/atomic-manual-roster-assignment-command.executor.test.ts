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
  ManualRosterAssignmentService
} from "../services/manual-roster-assignment.service.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AtomicManualRosterAssignmentCommandExecutor
} from "./atomic-manual-roster-assignment-command.executor.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe(
  "AtomicManualRosterAssignmentCommandExecutor",
  () => {
    const leagueId =
      "league-atomic-manual-assignment";
    const auctionSessionId =
      "session-atomic-manual-assignment";
    const teamId =
      "team-atomic-manual-assignment";
    const auctionSessionTeamId =
      "session-team-atomic-manual-assignment";
    const playerId =
      "player-atomic-manual-assignment";

    let executor:
      AtomicManualRosterAssignmentCommandExecutor;

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
            "Atomic Manual Assignment League",
          normalizedName:
            "atomic manual assignment league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 97,
          status: "SETUP",
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          stateVersion: 0
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name:
            "Atomic Manual Assignment Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 100
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode:
            "ATOMIC-ASSIGNMENT-001",
          name:
            "Atomic Assignment Player",
          normalizedName:
            "atomic assignment player",
          role: "A",
          availabilityStatus:
            "AVAILABLE"
        })
        .run();

      const manualService =
        new ManualRosterAssignmentService(
          new SqliteAuctionSessionRepository(),
          new SqliteAuctionSessionTeamRepository(),
          new SqliteRosterEntryRepository(),
          new SqlitePlayerRepository()
        );

      executor =
        new AtomicManualRosterAssignmentCommandExecutor(
          new SqliteAuctionSessionStateRepository(),
          new SqliteCommandRegistryRepository(),
          manualService,
          new SqliteAuctionCallRepository(),
          new SqliteAuctionSessionTeamRepository(),
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
          "manual-assignment-command-1",
        commandType:
          "ADD_MANUAL_ROSTER_ASSIGNMENT" as const,
        expectedStateVersion:
          overrides.expectedStateVersion ?? 0,
        requestFingerprint:
          overrides.requestFingerprint ??
          "manual-assignment:team:player:30:3",
        actorName:
          "Gianfranco",
        actorRole:
          "AUCTIONEER" as const,
        manualAssignmentReason:
          "OPTION_EXERCISED_MANUALLY" as const,
        comment:
          "Assegnazione manuale opzionato",
        assignment: {
          auctionSessionId,
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 30,
          contractYear: 3 as const
        }
      };
    }

    it(
      "rejects manual assignment while an operational auction call exists without mutating state",
      async () => {
        db.update(auctionSessions)
          .set({
            status: "SUSPENDED"
          })
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .run();

        db.insert(auctionCalls)
          .values({
            id:
              "operational-call-manual-assignment",
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
              rosterEntries.playerId,
              playerId
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
      "persists the manual assignment and increments stateVersion atomically",
      async () => {
        const result =
          await executor.execute(
            createInput()
          );

        expect(result).toMatchObject({
          stateVersion: 1,
          idempotentReplay: false,
          rosterEntry: {
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 30,
            contractYear: 3,
            source: "MANUAL_ASSIGNMENT"
          }
        });

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.playerId,
              playerId
            )
          )
          .get();

        expect(storedEntry).toBeDefined();

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
        ).toBe(70);

        const storedPlayer = db
          .select()
          .from(players)
          .where(eq(players.id, playerId))
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
        ).toBe(1);

        const storedCommand = db
          .select()
          .from(commandRegistry)
          .where(
            eq(
              commandRegistry.commandId,
              "manual-assignment-command-1"
            )
          )
          .get();

        expect(storedCommand).toMatchObject({
          auctionSessionId,
          commandScope:
            "AUCTION_SESSION",
          commandType:
            "ADD_MANUAL_ROSTER_ASSIGNMENT",
          expectedStateVersion: 0,
          resultStateVersion: 1
        });

        const storedEvents = db
          .select()
          .from(auctionEvents)
          .all();

        expect(storedEvents).toHaveLength(1);

        expect(storedEvents[0]).toMatchObject({
          auctionSessionId,
          auctionCallId: null,
          eventType:
            "MANUAL_ROSTER_ASSIGNMENT_ADDED",
          auctionSessionTeamId,
          playerId,
          amount: 30,
          creditsBefore: 100,
          creditsAfter: 70,
          contractYear: 3,
          actorName: "Gianfranco",
          actorRole: "AUCTIONEER",
          comment:
            "Assegnazione manuale opzionato",
          manualAssignmentReason:
            "OPTION_EXERCISED_MANUALLY",
          suspensionReason: null
        });
      }
    );

    it(
      "returns the original result for an identical retry",
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
            .from(rosterEntries)
            .all()
        ).toHaveLength(1);

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
        ).toBe(70);
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
                "manual-assignment:different"
            })
          )
        ).rejects.toMatchObject({
          code: "COMMAND_ID_CONFLICT"
        });
      }
    );

    it(
      "rejects a stale state version without mutating the roster",
      async () => {
        await expect(
          executor.execute(
            createInput({
              expectedStateVersion: 1
            })
          )
        ).rejects.toMatchObject({
          code: "STALE_STATE"
        });

        expect(
          db.select()
            .from(rosterEntries)
            .all()
        ).toHaveLength(0);

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

        const storedPlayer = db
          .select()
          .from(players)
          .where(eq(players.id, playerId))
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
        ).toBe(0);
      }
    );

    it(
      "rolls back roster credits player stateVersion and audit when command registration fails",
      async () => {
        class FailingCommandRegistryRepository
          extends SqliteCommandRegistryRepository
        {
          createManualRosterAssignmentCommandWithExecutor(): never {
            throw new Error(
              "simulated registry failure"
            );
          }
        }

        const manualService =
          new ManualRosterAssignmentService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionTeamRepository(),
            new SqliteRosterEntryRepository(),
            new SqlitePlayerRepository()
          );

        const failingExecutor =
          new AtomicManualRosterAssignmentCommandExecutor(
            new SqliteAuctionSessionStateRepository(),
            new FailingCommandRegistryRepository(),
            manualService,
            new SqliteAuctionCallRepository(),
            new SqliteAuctionSessionTeamRepository(),
            new SqliteAuctionEventRepository()
          );

        await expect(
          failingExecutor.execute(
            createInput()
          )
        ).rejects.toThrow(
          "simulated registry failure"
        );

        expect(
          db.select()
            .from(rosterEntries)
            .all()
        ).toHaveLength(0);

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
          .where(eq(players.id, playerId))
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
