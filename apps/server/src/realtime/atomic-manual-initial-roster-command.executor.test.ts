import {
  beforeEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
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
  ManualInitialRosterEntryService
} from "../services/manual-initial-roster-entry.service.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AtomicManualInitialRosterCommandExecutor
} from "./atomic-manual-initial-roster-command.executor.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe(
  "AtomicManualInitialRosterCommandExecutor",
  () => {
    const leagueId =
      "league-atomic-manual-roster";
    const auctionSessionId =
      "session-atomic-manual-roster";
    const teamId =
      "team-atomic-manual-roster";
    const auctionSessionTeamId =
      "session-team-atomic-manual-roster";
    const playerId =
      "player-atomic-manual-roster";

    let executor:
      AtomicManualInitialRosterCommandExecutor;

    beforeEach(() => {
      db.delete(commandRegistry).run();
      db.delete(auctionEvents).run();
      db.delete(rosterEntries).run();
      db.delete(players).run();
      db.delete(auctionSessionTeams).run();
      db.delete(teams).run();
      db.delete(auctionSessions).run();
      db.delete(leagues).run();

      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Atomic Manual Roster League",
          normalizedName:
            "atomic manual roster league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 96,
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
          name: "Atomic Manual Roster Team"
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
          fmsCode: "ATOMIC-MANUAL-001",
          name: "Atomic Manual Player",
          normalizedName:
            "atomic manual player",
          role: "C",
          availabilityStatus: "AVAILABLE"
        })
        .run();

      const manualService =
        new ManualInitialRosterEntryService(
          new SqliteAuctionSessionRepository(),
          new SqliteAuctionSessionTeamRepository(),
          new SqliteRosterEntryRepository(),
          new SqlitePlayerRepository()
        );

      executor =
        new AtomicManualInitialRosterCommandExecutor(
          new SqliteAuctionSessionStateRepository(),
          new SqliteCommandRegistryRepository(),
          manualService,
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
          "manual-roster-command-1",
        commandType:
          "ADD_MANUAL_INITIAL_ROSTER_ENTRY" as const,
        expectedStateVersion:
          overrides.expectedStateVersion ?? 0,
        requestFingerprint:
          overrides.requestFingerprint ??
          "manual-roster:team:player:25:2",
        actorName:
          "Gianfranco",
        actorRole:
          "AUCTIONEER" as const,
        comment:
          "Inserimento manuale iniziale",
        entry: {
          auctionSessionId,
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 25,
          contractYear: 2 as const
        }
      };
    }

    it(
      "persists the manual roster mutation and increments stateVersion atomically",
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
            acquisitionCost: 25,
            contractYear: 2,
            source: "INITIAL_ROSTER"
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
        ).toBe(75);

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
              "manual-roster-command-1"
            )
          )
          .get();

        expect(storedCommand).toMatchObject({
          auctionSessionId,
          commandScope: "AUCTION_SESSION",
          commandType:
            "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
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
            "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY",
          auctionSessionTeamId,
          playerId,
          amount: 25,
          creditsBefore: 100,
          creditsAfter: 75,
          contractYear: 2,
          actorName: "Gianfranco",
          actorRole: "AUCTIONEER",
          comment:
            "Inserimento manuale iniziale",
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

        const storedEntries = db
          .select()
          .from(rosterEntries)
          .all();

        expect(storedEntries).toHaveLength(1);

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
        ).toBe(75);

        expect(
          db.select()
            .from(auctionEvents)
            .all()
        ).toHaveLength(1);
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
                "manual-roster:different"
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
      "rolls back roster credits player and stateVersion when command registration fails",
      async () => {
        class FailingCommandRegistryRepository
          extends SqliteCommandRegistryRepository
        {
          createManualInitialRosterCommandWithExecutor(): never {
            throw new Error(
              "simulated registry failure"
            );
          }
        }

        const manualService =
          new ManualInitialRosterEntryService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionTeamRepository(),
            new SqliteRosterEntryRepository(),
            new SqlitePlayerRepository()
          );

        const failingExecutor =
          new AtomicManualInitialRosterCommandExecutor(
            new SqliteAuctionSessionStateRepository(),
            new FailingCommandRegistryRepository(),
            manualService,
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
