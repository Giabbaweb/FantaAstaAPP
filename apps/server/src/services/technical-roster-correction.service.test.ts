import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import {
  eq,
  inArray
} from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  leagues,
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";
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
} from "./technical-roster-correction.service.js";

const leagueId =
  "league-technical-correction-test";
const auctionSessionId =
  "session-technical-correction-test";

const sourceTeamId =
  "team-technical-correction-source";
const targetTeamId =
  "team-technical-correction-target";

const sourceAuctionSessionTeamId =
  "session-team-technical-correction-source";
const targetAuctionSessionTeamId =
  "session-team-technical-correction-target";

const sourcePlayerId =
  "player-technical-correction-source";
const targetPlayerId =
  "player-technical-correction-target";

const rosterEntryId =
  "roster-entry-technical-correction";

function seedBase(): void {
  db.insert(leagues)
    .values({
      id: leagueId,
      name: "Technical Correction Test League",
      normalizedName:
        "technical correction test league"
    })
    .run();

  db.insert(auctionSessions)
    .values({
      id: auctionSessionId,
      leagueId,
      season: "2026/2027",
      editionNumber: 97,
      initialCredits: 330,
      status: "SUSPENDED"
    })
    .run();

  db.insert(teams)
    .values([
      {
        id: sourceTeamId,
        leagueId,
        name: "Technical Correction Source Team"
      },
      {
        id: targetTeamId,
        leagueId,
        name: "Technical Correction Target Team"
      }
    ])
    .run();

  db.insert(auctionSessionTeams)
    .values([
      {
        id: sourceAuctionSessionTeamId,
        auctionSessionId,
        teamId: sourceTeamId,
        tableOrder: 1,
        renewalCredits: 0,
        remainingCredits: 80
      },
      {
        id: targetAuctionSessionTeamId,
        auctionSessionId,
        teamId: targetTeamId,
        tableOrder: 2,
        renewalCredits: 0,
        remainingCredits: 100
      }
    ])
    .run();

  db.insert(players)
    .values([
      {
        id: sourcePlayerId,
        auctionSessionId,
        fmsCode: "TECH-CORRECTION-001",
        name: "Technical Correction Source Player",
        normalizedName:
          "technical correction source player",
        role: "C",
        availabilityStatus: "ROSTERED"
      },
      {
        id: targetPlayerId,
        auctionSessionId,
        fmsCode: "TECH-CORRECTION-002",
        name: "Technical Correction Target Player",
        normalizedName:
          "technical correction target player",
        role: "C",
        availabilityStatus: "AVAILABLE"
      }
    ])
    .run();

  db.insert(rosterEntries)
    .values({
      id: rosterEntryId,
      auctionSessionTeamId:
        sourceAuctionSessionTeamId,
      playerId: sourcePlayerId,
      acquisitionCost: 20,
      contractYear: 1,
      source: "AUCTION"
    })
    .run();
}

function createService():
  TechnicalRosterCorrectionService {
  return new TechnicalRosterCorrectionService(
    new SqliteAuctionSessionRepository(),
    new SqliteAuctionSessionTeamRepository(),
    new SqliteRosterEntryRepository(),
    new SqlitePlayerRepository()
  );
}

describe(
  "TechnicalRosterCorrectionService",
  () => {
    afterEach(() => {
      db.delete(rosterEntries)
        .where(
          inArray(
            rosterEntries.auctionSessionTeamId,
            [
              sourceAuctionSessionTeamId,
              targetAuctionSessionTeamId
            ]
          )
        )
        .run();

      db.delete(players)
        .where(
          eq(
            players.auctionSessionId,
            auctionSessionId
          )
        )
        .run();

      db.delete(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.auctionSessionId,
            auctionSessionId
          )
        )
        .run();

      db.delete(teams)
        .where(eq(teams.leagueId, leagueId))
        .run();

      db.delete(auctionSessions)
        .where(
          eq(
            auctionSessions.id,
            auctionSessionId
          )
        )
        .run();

      db.delete(leagues)
        .where(eq(leagues.id, leagueId))
        .run();
    });

    it(
      "corrects the acquisition cost on the same team",
      () => {
        seedBase();

        const result = createService().execute({
          auctionSessionId,
          rosterEntryId,
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId: sourcePlayerId,
          acquisitionCost: 30,
          contractYear: 1
        });

        expect(result.before).toMatchObject({
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId: sourcePlayerId,
          acquisitionCost: 20,
          contractYear: 1
        });

        expect(result.after).toMatchObject({
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId: sourcePlayerId,
          acquisitionCost: 30,
          contractYear: 1
        });

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(eq(rosterEntries.id, rosterEntryId))
          .get();

        expect(storedEntry).toMatchObject({
          acquisitionCost: 30,
          source: "TECHNICAL_CORRECTION"
        });

        const storedTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              sourceAuctionSessionTeamId
            )
          )
          .get();

        expect(
          storedTeam?.remainingCredits
        ).toBe(70);
      }
    );

    it(
      "moves the roster entry to another team",
      () => {
        seedBase();

        const result = createService().execute({
          auctionSessionId,
          rosterEntryId,
          auctionSessionTeamId:
            targetAuctionSessionTeamId,
          playerId: sourcePlayerId,
          acquisitionCost: 20,
          contractYear: 1
        });

        expect(
          result.after.auctionSessionTeamId
        ).toBe(targetAuctionSessionTeamId);

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(eq(rosterEntries.id, rosterEntryId))
          .get();

        expect(storedEntry).toMatchObject({
          auctionSessionTeamId:
            targetAuctionSessionTeamId,
          acquisitionCost: 20,
          source: "TECHNICAL_CORRECTION"
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
        ).toBe(80);
      }
    );

    it(
      "replaces the player and updates availability",
      () => {
        seedBase();

        const result = createService().execute({
          auctionSessionId,
          rosterEntryId,
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId: targetPlayerId,
          acquisitionCost: 20,
          contractYear: 1
        });

        expect(result.after.playerId)
          .toBe(targetPlayerId);

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(eq(rosterEntries.id, rosterEntryId))
          .get();

        expect(storedEntry).toMatchObject({
          playerId: targetPlayerId,
          acquisitionCost: 20,
          source: "TECHNICAL_CORRECTION"
        });

        const sourcePlayer = db
          .select()
          .from(players)
          .where(eq(players.id, sourcePlayerId))
          .get();

        const targetPlayer = db
          .select()
          .from(players)
          .where(eq(players.id, targetPlayerId))
          .get();

        expect(
          sourcePlayer?.availabilityStatus
        ).toBe("AVAILABLE");

        expect(
          targetPlayer?.availabilityStatus
        ).toBe("ROSTERED");
      }
    );

    it(
      "rejects technical corrections while the session is RUNNING",
      () => {
        seedBase();

        db.update(auctionSessions)
          .set({
            status: "RUNNING"
          })
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .run();

        expect(() =>
          createService().execute({
            auctionSessionId,
            rosterEntryId,
            auctionSessionTeamId:
              sourceAuctionSessionTeamId,
            playerId: sourcePlayerId,
            acquisitionCost: 20,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "TECHNICAL_CORRECTION_NOT_ALLOWED_IN_SESSION_STATUS"
          })
        );
      }
    );

    it(
      "rejects technical corrections while the session is CLOSED",
      () => {
        seedBase();

        db.update(auctionSessions)
          .set({
            status: "CLOSED"
          })
          .where(
            eq(
              auctionSessions.id,
              auctionSessionId
            )
          )
          .run();

        expect(() =>
          createService().execute({
            auctionSessionId,
            rosterEntryId,
            auctionSessionTeamId:
              sourceAuctionSessionTeamId,
            playerId: sourcePlayerId,
            acquisitionCost: 20,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "TECHNICAL_CORRECTION_NOT_ALLOWED_IN_SESSION_STATUS"
          })
        );
      }
    );

    it(
      "rejects a target player that already belongs to another roster",
      () => {
        seedBase();

        db.insert(rosterEntries)
          .values({
            id:
              "roster-entry-technical-correction-existing-target",
            auctionSessionTeamId:
              targetAuctionSessionTeamId,
            playerId:
              targetPlayerId,
            acquisitionCost: 10,
            contractYear: 1,
            source: "AUCTION"
          })
          .run();

        db.update(players)
          .set({
            availabilityStatus:
              "ROSTERED"
          })
          .where(
            eq(
              players.id,
              targetPlayerId
            )
          )
          .run();

        expect(() =>
          createService().execute({
            auctionSessionId,
            rosterEntryId,
            auctionSessionTeamId:
              sourceAuctionSessionTeamId,
            playerId:
              targetPlayerId,
            acquisitionCost: 20,
            contractYear: 1
          })
        ).toThrow();
      }
    );

    it(
      "rejects an unavailable target player",
      () => {
        seedBase();

        db.update(players)
          .set({
            availabilityStatus:
              "UNAVAILABLE"
          })
          .where(
            eq(
              players.id,
              targetPlayerId
            )
          )
          .run();

        expect(() =>
          createService().execute({
            auctionSessionId,
            rosterEntryId,
            auctionSessionTeamId:
              sourceAuctionSessionTeamId,
            playerId:
              targetPlayerId,
            acquisitionCost: 20,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "TARGET_PLAYER_NOT_AVAILABLE"
          })
        );
      }
    );

    it(
      "rejects an economically unsustainable correction",
      () => {
        seedBase();

        expect(() =>
          createService().execute({
            auctionSessionId,
            rosterEntryId,
            auctionSessionTeamId:
              sourceAuctionSessionTeamId,
            playerId:
              sourcePlayerId,
            acquisitionCost: 99,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
          })
        );
      }
    );

    it(
      "rolls back the roster entry and source credits when the target team update fails",
      () => {
        seedBase();

        const realTeamRepository =
          new SqliteAuctionSessionTeamRepository();

        const service =
          new TechnicalRosterCorrectionService(
            new SqliteAuctionSessionRepository(),
            {
              findByIdWithExecutor:
                realTeamRepository
                  .findByIdWithExecutor
                  .bind(realTeamRepository),
              findByAuctionSessionIdWithExecutor:
                realTeamRepository
                  .findByAuctionSessionIdWithExecutor
                  .bind(realTeamRepository),
              updateRemainingCreditsWithExecutor:
                (
                  executor,
                  id,
                  remainingCredits
                ) => {
                  if (
                    id ===
                    targetAuctionSessionTeamId
                  ) {
                    return null;
                  }

                  return realTeamRepository
                    .updateRemainingCreditsWithExecutor(
                      executor,
                      id,
                      remainingCredits
                    );
                }
            },
            new SqliteRosterEntryRepository(),
            new SqlitePlayerRepository()
          );

        expect(() =>
          service.execute({
            auctionSessionId,
            rosterEntryId,
            auctionSessionTeamId:
              targetAuctionSessionTeamId,
            playerId:
              sourcePlayerId,
            acquisitionCost: 35,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "TARGET_TEAM_UPDATE_FAILED"
          })
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
          source: "AUCTION"
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
      }
    );

    it(
      "rolls back roster credits and player availability when the target player update fails",
      () => {
        seedBase();

        const realPlayerRepository =
          new SqlitePlayerRepository();

        const service =
          new TechnicalRosterCorrectionService(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionTeamRepository(),
            new SqliteRosterEntryRepository(),
            {
              findByIdWithExecutor:
                realPlayerRepository
                  .findByIdWithExecutor
                  .bind(realPlayerRepository),
              findByIdsWithExecutor:
                realPlayerRepository
                  .findByIdsWithExecutor
                  .bind(realPlayerRepository),
              updateAvailabilityStatusWithExecutor:
                (
                  executor,
                  id,
                  availabilityStatus
                ) => {
                  if (
                    id ===
                    targetPlayerId
                  ) {
                    return null;
                  }

                  return realPlayerRepository
                    .updateAvailabilityStatusWithExecutor(
                      executor,
                      id,
                      availabilityStatus
                    );
                }
            }
          );

        expect(() =>
          service.execute({
            auctionSessionId,
            rosterEntryId,
            auctionSessionTeamId:
              sourceAuctionSessionTeamId,
            playerId:
              targetPlayerId,
            acquisitionCost: 30,
            contractYear: 2
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "TARGET_PLAYER_UPDATE_FAILED"
          })
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
          source: "AUCTION"
        });

        const storedTeam = db
          .select()
          .from(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams.id,
              sourceAuctionSessionTeamId
            )
          )
          .get();

        expect(
          storedTeam?.remainingCredits
        ).toBe(80);

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
      }
    );

    it(
      "corrects team player cost and contract year together",
      () => {
        seedBase();

        const result = createService().execute({
          auctionSessionId,
          rosterEntryId,
          auctionSessionTeamId:
            targetAuctionSessionTeamId,
          playerId: targetPlayerId,
          acquisitionCost: 35,
          contractYear: 3
        });

        expect(result.before).toMatchObject({
          auctionSessionTeamId:
            sourceAuctionSessionTeamId,
          playerId: sourcePlayerId,
          acquisitionCost: 20,
          contractYear: 1
        });

        expect(result.after).toMatchObject({
          auctionSessionTeamId:
            targetAuctionSessionTeamId,
          playerId: targetPlayerId,
          acquisitionCost: 35,
          contractYear: 3
        });

        const storedEntry = db
          .select()
          .from(rosterEntries)
          .where(eq(rosterEntries.id, rosterEntryId))
          .get();

        expect(storedEntry).toMatchObject({
          auctionSessionTeamId:
            targetAuctionSessionTeamId,
          playerId: targetPlayerId,
          acquisitionCost: 35,
          contractYear: 3,
          source: "TECHNICAL_CORRECTION"
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
          .where(eq(players.id, sourcePlayerId))
          .get();

        const targetPlayer = db
          .select()
          .from(players)
          .where(eq(players.id, targetPlayerId))
          .get();

        expect(
          sourcePlayer?.availabilityStatus
        ).toBe("AVAILABLE");

        expect(
          targetPlayer?.availabilityStatus
        ).toBe("ROSTERED");
      }
    );
  }
);
