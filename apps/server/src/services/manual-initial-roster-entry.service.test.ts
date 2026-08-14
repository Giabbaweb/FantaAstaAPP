import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

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
  ManualInitialRosterEntryService
} from "./manual-initial-roster-entry.service.js";

const leagueId =
  "league-manual-initial-roster-test";
const auctionSessionId =
  "session-manual-initial-roster-test";
const teamId =
  "team-manual-initial-roster-test";
const auctionSessionTeamId =
  "session-team-manual-initial-roster-test";
const playerId =
  "player-manual-initial-roster-test";

function seedBase(
  options: {
    status?:
      | "SETUP"
      | "READY"
      | "RUNNING"
      | "SUSPENDED"
      | "COMPLETED"
      | "CLOSED";
    maximumInitialRosterEntries?: number;
    remainingCredits?: number;
  } = {}
): void {
  db.insert(leagues)
    .values({
      id: leagueId,
      name: "Manual Initial Roster Test League",
      normalizedName:
        "manual initial roster test league"
    })
    .run();

  db.insert(auctionSessions)
    .values({
      id: auctionSessionId,
      leagueId,
      season: "2026/2027",
      editionNumber: 97,
      initialCredits: 330,
      maximumInitialRosterEntries:
        options.maximumInitialRosterEntries ??
        11,
      status: options.status ?? "SETUP"
    })
    .run();

  db.insert(teams)
    .values({
      id: teamId,
      leagueId,
      name: "Manual Initial Roster Test Team"
    })
    .run();

  db.insert(auctionSessionTeams)
    .values({
      id: auctionSessionTeamId,
      auctionSessionId,
      teamId,
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits:
        options.remainingCredits ?? 100
    })
    .run();

  db.insert(players)
    .values({
      id: playerId,
      auctionSessionId,
      fmsCode: "MANUAL-INITIAL-001",
      name: "Manual Initial Player",
      normalizedName:
        "manual initial player",
      role: "C",
      availabilityStatus: "AVAILABLE"
    })
    .run();
}

function createService(): ManualInitialRosterEntryService {
  return new ManualInitialRosterEntryService(
    new SqliteAuctionSessionRepository(),
    new SqliteAuctionSessionTeamRepository(),
    new SqliteRosterEntryRepository(),
    new SqlitePlayerRepository()
  );
}

describe(
  "ManualInitialRosterEntryService",
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
      "persists a manual initial roster entry atomically",
      () => {
        seedBase();

        const service = createService();

        service.execute({
          auctionSessionId,
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 25,
          contractYear: 2
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

        expect(storedEntry).toMatchObject({
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 25,
          contractYear: 2,
          source: "INITIAL_ROSTER"
        });

        const storedPlayer = db
          .select()
          .from(players)
          .where(eq(players.id, playerId))
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("ROSTERED");

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
      }
    );

    it(
      "respects the configured initial roster entry limit",
      () => {
        seedBase({
          maximumInitialRosterEntries: 1
        });

        const existingPlayerId =
          "player-existing-initial-roster-test";

        db.insert(players)
          .values({
            id: existingPlayerId,
            auctionSessionId,
            fmsCode: "MANUAL-INITIAL-EXISTING",
            name: "Existing Initial Player",
            normalizedName:
              "existing initial player",
            role: "D",
            availabilityStatus: "ROSTERED"
          })
          .run();

        db.insert(rosterEntries)
          .values({
            id: "existing-initial-roster-entry",
            auctionSessionTeamId,
            playerId: existingPlayerId,
            acquisitionCost: 10,
            contractYear: 2,
            source: "INITIAL_ROSTER"
          })
          .run();

        const service = createService();

        expect(() =>
          service.execute({
            auctionSessionId,
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 10,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INITIAL_ROSTER_LIMIT_EXCEEDED"
          })
        );

        const createdEntry = db
          .select()
          .from(rosterEntries)
          .where(
            eq(
              rosterEntries.playerId,
              playerId
            )
          )
          .get();

        expect(createdEntry).toBeUndefined();
      }
    );

    it(
      "rejects manual initial roster entries while the session is RUNNING",
      () => {
        seedBase({
          status: "RUNNING"
        });

        const service = createService();

        expect(() =>
          service.execute({
            auctionSessionId,
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 10,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "MANUAL_INITIAL_ROSTER_NOT_ALLOWED_IN_STATUS"
          })
        );

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
      }
    );

    it(
      "rejects an acquisition that would make the roster impossible to complete",
      () => {
        seedBase({
          remainingCredits: 24
        });

        const service = createService();

        expect(() =>
          service.execute({
            auctionSessionId,
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 2,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code:
              "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
          })
        );

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

        const storedPlayer = db
          .select()
          .from(players)
          .where(eq(players.id, playerId))
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("AVAILABLE");
      }
    );

    it(
      "rolls back roster and credits when the player update fails",
      () => {
        seedBase();

        const realPlayerRepository =
          new SqlitePlayerRepository();

        const service =
          new ManualInitialRosterEntryService(
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
                () => null
            }
          );

        expect(() =>
          service.execute({
            auctionSessionId,
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 25,
            contractYear: 1
          })
        ).toThrowError(
          expect.objectContaining({
            code: "PLAYER_UPDATE_FAILED"
          })
        );

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
          .where(eq(players.id, playerId))
          .get();

        expect(
          storedPlayer?.availabilityStatus
        ).toBe("AVAILABLE");
      }
    );
  }
);
