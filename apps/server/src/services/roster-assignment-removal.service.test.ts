import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import {
  eq
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
  RosterAssignmentRemovalService
} from "./roster-assignment-removal.service.js";

const leagueId =
  "league-roster-removal-test";
const auctionSessionId =
  "session-roster-removal-test";
const teamId =
  "team-roster-removal-test";
const auctionSessionTeamId =
  "session-team-roster-removal-test";
const playerId =
  "player-roster-removal-test";
const rosterEntryId =
  "roster-entry-removal-test";

function seedBase(
  source:
    | "INITIAL_ROSTER"
    | "AUCTION"
    | "MANUAL_ASSIGNMENT"
    | "TECHNICAL_CORRECTION" =
      "AUCTION"
): void {
  db.insert(leagues)
    .values({
      id: leagueId,
      name: "Roster Removal Test League",
      normalizedName:
        "roster removal test league"
    })
    .run();

  db.insert(auctionSessions)
    .values({
      id: auctionSessionId,
      leagueId,
      season: "2026/2027",
      editionNumber: 96,
      initialCredits: 330,
      status: "SUSPENDED"
    })
    .run();

  db.insert(teams)
    .values({
      id: teamId,
      leagueId,
      name: "Roster Removal Test Team"
    })
    .run();

  db.insert(auctionSessionTeams)
    .values({
      id: auctionSessionTeamId,
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
      fmsCode: "ROSTER-REMOVAL-001",
      name: "Roster Removal Player",
      normalizedName:
        "roster removal player",
      role: "C",
      availabilityStatus: "ROSTERED"
    })
    .run();

  db.insert(rosterEntries)
    .values({
      id: rosterEntryId,
      auctionSessionTeamId,
      playerId,
      acquisitionCost: 20,
      contractYear: 1,
      source
    })
    .run();
}

function createService():
  RosterAssignmentRemovalService {
  return new RosterAssignmentRemovalService(
    new SqliteAuctionSessionRepository(),
    new SqliteAuctionSessionTeamRepository(),
    new SqliteRosterEntryRepository(),
    new SqlitePlayerRepository()
  );
}

describe(
  "RosterAssignmentRemovalService",
  () => {
    afterEach(() => {
      db.delete(rosterEntries)
        .where(
          eq(
            rosterEntries.auctionSessionTeamId,
            auctionSessionTeamId
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
      "removes the roster entry, refunds its full cost and makes the player available",
      () => {
        seedBase();

        const rosterBefore = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.auctionSessionTeamId,
              auctionSessionTeamId
            )
          )
          .all();

        const centroSlotsUsedBefore =
          rosterBefore.length;

        const result =
          createService().execute({
            auctionSessionId,
            rosterEntryId
          });

        expect(result.removed)
          .toMatchObject({
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 20
          });

        expect(
          result.remainingCreditsAfterRemoval
        ).toBe(100);

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

        expect(storedEntry)
          .toBeUndefined();

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
            eq(players.id, playerId)
          )
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("AVAILABLE");

        const rosterAfter = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.auctionSessionTeamId,
              auctionSessionTeamId
            )
          )
          .all();

        expect(rosterBefore)
          .toHaveLength(1);

        expect(rosterAfter)
          .toHaveLength(0);

        /*
         * Il giocatore rimosso è un C:
         * la composizione reale della rosa passa
         * da un C presente a nessun C presente.
         * Gli slot vengono quindi liberati per
         * derivazione dalla rosa, senza contatori
         * mutabili separati.
         */
        expect(centroSlotsUsedBefore)
          .toBe(1);

        expect(
          rosterAfter.length
        ).toBe(0);
      }
    );

    it(
      "removes an INITIAL_ROSTER entry with the same full refund rule",
      () => {
        seedBase("INITIAL_ROSTER");

        const result =
          createService().execute({
            auctionSessionId,
            rosterEntryId
          });

        expect(
          result.removed.rosterEntry.source
        ).toBe("INITIAL_ROSTER");

        expect(
          result.remainingCreditsAfterRemoval
        ).toBe(100);

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

        expect(storedEntry)
          .toBeUndefined();

        const storedPlayer = db
          .select()
          .from(players)
          .where(
            eq(players.id, playerId)
          )
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("AVAILABLE");
      }
    );

    it(
      "does not restrict removal by roster entry provenance",
      () => {
        for (
          const source of [
            "MANUAL_ASSIGNMENT",
            "TECHNICAL_CORRECTION"
          ] as const
        ) {
          seedBase(source);

          const result =
            createService().execute({
              auctionSessionId,
              rosterEntryId
            });

          expect(
            result.removed.rosterEntry.source
          ).toBe(source);

          expect(
            result.remainingCreditsAfterRemoval
          ).toBe(100);

          db.delete(rosterEntries)
            .where(
              eq(
                rosterEntries.auctionSessionTeamId,
                auctionSessionTeamId
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
            .where(
              eq(teams.leagueId, leagueId)
            )
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
            .where(
              eq(leagues.id, leagueId)
            )
            .run();
        }
      }
    );

    it(
      "rejects removal while the session is RUNNING",
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
            rosterEntryId
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "ROSTER_ASSIGNMENT_REMOVAL_NOT_ALLOWED_IN_SESSION_STATUS"
          })
        );
      }
    );

    it(
      "rejects removal while the session is CLOSED",
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
            rosterEntryId
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "ROSTER_ASSIGNMENT_REMOVAL_NOT_ALLOWED_IN_SESSION_STATUS"
          })
        );
      }
    );
  }
);
