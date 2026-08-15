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
  TechnicalRosterCorrectionService
} from "../services/technical-roster-correction.service.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  AtomicTechnicalRosterCorrectionCommandExecutor
} from "./atomic-technical-roster-correction-command.executor.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe(
  "AtomicTechnicalRosterCorrectionCommandExecutor",
  () => {
    const leagueId =
      "league-atomic-technical-correction";
    const auctionSessionId =
      "session-atomic-technical-correction";

    const sourceTeamId =
      "team-atomic-technical-source";
    const targetTeamId =
      "team-atomic-technical-target";

    const sourceAuctionSessionTeamId =
      "session-team-atomic-technical-source";
    const targetAuctionSessionTeamId =
      "session-team-atomic-technical-target";

    const sourcePlayerId =
      "player-atomic-technical-source";
    const targetPlayerId =
      "player-atomic-technical-target";

    const rosterEntryId =
      "roster-entry-atomic-technical";

    let executor:
      AtomicTechnicalRosterCorrectionCommandExecutor;

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
          name:
            "Atomic Technical Correction League",
          normalizedName:
            "atomic technical correction league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 97,
          status: "SUSPENDED",
          initialCredits: 330,
          stateVersion: 0
        })
        .run();

      db.insert(teams)
        .values([
          {
            id: sourceTeamId,
            leagueId,
            name:
              "Atomic Technical Source Team"
          },
          {
            id: targetTeamId,
            leagueId,
            name:
              "Atomic Technical Target Team"
          }
        ])
        .run();

      db.insert(auctionSessionTeams)
        .values([
          {
            id:
              sourceAuctionSessionTeamId,
            auctionSessionId,
            teamId:
              sourceTeamId,
            tableOrder: 1,
            renewalCredits: 0,
            remainingCredits: 80
          },
          {
            id:
              targetAuctionSessionTeamId,
            auctionSessionId,
            teamId:
              targetTeamId,
            tableOrder: 2,
            renewalCredits: 0,
            remainingCredits: 100
          }
        ])
        .run();

      db.insert(players)
        .values([
          {
            id:
              sourcePlayerId,
            auctionSessionId,
            fmsCode:
              "ATOMIC-TECH-001",
            name:
              "Atomic Technical Source Player",
            normalizedName:
              "atomic technical source player",
            role: "C",
            availabilityStatus:
              "ROSTERED"
          },
          {
            id:
              targetPlayerId,
            auctionSessionId,
            fmsCode:
              "ATOMIC-TECH-002",
            name:
              "Atomic Technical Target Player",
            normalizedName:
              "atomic technical target player",
            role: "A",
            availabilityStatus:
              "AVAILABLE"
          }
        ])
        .run();

      db.insert(rosterEntries)
        .values({
          id:
            rosterEntryId,
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId:
            sourcePlayerId,
          acquisitionCost: 20,
          contractYear: 1,
          source: "AUCTION"
        })
        .run();

      const correctionService =
        new TechnicalRosterCorrectionService(
          new SqliteAuctionSessionRepository(),
          new SqliteAuctionSessionTeamRepository(),
          new SqliteRosterEntryRepository(),
          new SqlitePlayerRepository()
        );

      executor =
        new AtomicTechnicalRosterCorrectionCommandExecutor(
          new SqliteAuctionSessionStateRepository(),
          new SqliteCommandRegistryRepository(),
          correctionService,
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
          "technical-correction-command-1",
        commandType:
          "TECHNICAL_ROSTER_CORRECTION" as const,
        expectedStateVersion:
          overrides.expectedStateVersion ?? 0,
        requestFingerprint:
          overrides.requestFingerprint ??
          "technical-correction:entry:target:35:3",
        actorName:
          "Gianfranco",
        actorRole:
          "AUCTIONEER" as const,
        comment:
          "Correzione tecnica completa",
        correction: {
          auctionSessionId,
          rosterEntryId,
          auctionSessionTeamId:
            targetAuctionSessionTeamId,
          playerId:
            targetPlayerId,
          acquisitionCost: 35,
          contractYear: 3 as const
        }
      };
    }

    it(
      "persists the correction audit and increments stateVersion atomically",
      async () => {
        const result =
          await executor.execute(
            createInput()
          );

        expect(result).toMatchObject({
          stateVersion: 1,
          idempotentReplay: false,
          correction: {
            before: {
              auctionSessionTeamId:
                sourceAuctionSessionTeamId,
              playerId:
                sourcePlayerId,
              acquisitionCost: 20,
              contractYear: 1
            },
            after: {
              auctionSessionTeamId:
                targetAuctionSessionTeamId,
              playerId:
                targetPlayerId,
              acquisitionCost: 35,
              contractYear: 3
            }
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

        expect(storedEntry).toMatchObject({
          auctionSessionTeamId:
            targetAuctionSessionTeamId,
          playerId:
            targetPlayerId,
          acquisitionCost: 35,
          contractYear: 3,
          source:
            "TECHNICAL_CORRECTION"
        });

        const sourceTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              sourceAuctionSessionTeamId
            )
          )
          .get();

        const targetTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              targetAuctionSessionTeamId
            )
          )
          .get();

        expect(
          sourceTeam?.remainingCredits
        ).toBe(100);

        expect(
          targetTeam?.remainingCredits
        ).toBe(65);

        const sourcePlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              sourcePlayerId
            )
          )
          .get();

        const targetPlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              targetPlayerId
            )
          )
          .get();

        expect(
          sourcePlayer?.availabilityStatus
        ).toBe("AVAILABLE");

        expect(
          targetPlayer?.availabilityStatus
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

        const storedEvents = db
          .select()
          .from(auctionEvents)
          .all();

        expect(storedEvents).toHaveLength(1);

        expect(storedEvents[0]).toMatchObject({
          auctionSessionId,
          eventType:
            "TECHNICAL_ROSTER_CORRECTION",
          actorName:
            "Gianfranco",
          actorRole:
            "AUCTIONEER",
          comment:
            "Correzione tecnica completa",
          beforeAuctionSessionTeamId:
            sourceAuctionSessionTeamId,
          beforePlayerId:
            sourcePlayerId,
          beforeAmount: 20,
          beforeContractYear: 1,
          afterAuctionSessionTeamId:
            targetAuctionSessionTeamId,
          afterPlayerId:
            targetPlayerId,
          afterAmount: 35,
          afterContractYear: 3
        });

        const storedCommand = db
          .select()
          .from(commandRegistry)
          .where(
            eq(
              commandRegistry.commandId,
              "technical-correction-command-1"
            )
          )
          .get();

        expect(storedCommand).toMatchObject({
          auctionSessionId,
          commandScope:
            "AUCTION_SESSION",
          commandType:
            "TECHNICAL_ROSTER_CORRECTION",
          expectedStateVersion: 0,
          resultStateVersion: 1
        });
      }
    );

    it(
      "returns the original correction for an identical retry",
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
                "technical-correction:different"
            })
          )
        ).rejects.toMatchObject({
          code:
            "COMMAND_ID_CONFLICT"
        });
      }
    );

    it(
      "rejects a stale state version without mutating the correction target",
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
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId:
            sourcePlayerId,
          acquisitionCost: 20,
          contractYear: 1,
          source:
            "AUCTION"
        });

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
      "rolls back correction stateVersion and audit when command registration fails",
      async () => {
        class FailingCommandRegistryRepository
          extends SqliteCommandRegistryRepository
        {
          createTechnicalRosterCorrectionCommandWithExecutor(): never {
            throw new Error(
              "simulated registry failure"
            );
          }
        }

        const correctionService =
          new TechnicalRosterCorrectionService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionTeamRepository(),
            new SqliteRosterEntryRepository(),
            new SqlitePlayerRepository()
          );

        const failingExecutor =
          new AtomicTechnicalRosterCorrectionCommandExecutor(
            new SqliteAuctionSessionStateRepository(),
            new FailingCommandRegistryRepository(),
            correctionService,
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
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId:
            sourcePlayerId,
          acquisitionCost: 20,
          contractYear: 1,
          source:
            "AUCTION"
        });

        const sourceTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              sourceAuctionSessionTeamId
            )
          )
          .get();

        const targetTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              targetAuctionSessionTeamId
            )
          )
          .get();

        expect(
          sourceTeam?.remainingCredits
        ).toBe(80);

        expect(
          targetTeam?.remainingCredits
        ).toBe(100);

        const sourcePlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              sourcePlayerId
            )
          )
          .get();

        const targetPlayer = db
          .select()
          .from(players)
          .where(
            eq(
              players.id,
              targetPlayerId
            )
          )
          .get();

        expect(
          sourcePlayer?.availabilityStatus
        ).toBe("ROSTERED");

        expect(
          targetPlayer?.availabilityStatus
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
