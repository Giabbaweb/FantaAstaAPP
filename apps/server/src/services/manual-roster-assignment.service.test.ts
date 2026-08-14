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
  ManualRosterAssignmentService
} from "./manual-roster-assignment.service.js";

const leagueId =
  "league-manual-assignment-test";
const auctionSessionId =
  "session-manual-assignment-test";
const teamId =
  "team-manual-assignment-test";
const auctionSessionTeamId =
  "session-team-manual-assignment-test";
const playerId =
  "player-manual-assignment-test";

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
      name: "Manual Assignment Test League",
      normalizedName:
        "manual assignment test league"
    })
    .run();

  db.insert(auctionSessions)
    .values({
      id: auctionSessionId,
      leagueId,
      season: "2026/2027",
      editionNumber: 98,
      initialCredits: 330,
      maximumInitialRosterEntries:
        options.maximumInitialRosterEntries ??
        11,
      status: options.status ?? "READY"
    })
    .run();

  db.insert(teams)
    .values({
      id: teamId,
      leagueId,
      name: "Manual Assignment Test Team"
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
      fmsCode: "MANUAL-ASSIGNMENT-001",
      name: "Manual Assignment Player",
      normalizedName:
        "manual assignment player",
      role: "C",
      availabilityStatus: "AVAILABLE"
    })
    .run();
}

function createService(): ManualRosterAssignmentService {
  return new ManualRosterAssignmentService(
    new SqliteAuctionSessionRepository(),
    new SqliteAuctionSessionTeamRepository(),
    new SqliteRosterEntryRepository(),
    new SqlitePlayerRepository()
  );
}

describe(
  "ManualRosterAssignmentService",
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
      "persists a manual roster assignment atomically",
      () => {
        seedBase();

        const service = createService();

        const result = service.execute({
          auctionSessionId,
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 25,
          contractYear: 2
        });

        expect(result).toMatchObject({
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 25,
          contractYear: 2,
          source: "MANUAL_ASSIGNMENT"
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
          source: "MANUAL_ASSIGNMENT"
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
      "does not apply the initial roster entry limit",
      () => {
        seedBase({
          maximumInitialRosterEntries: 0
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
        ).not.toThrow();

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
          source: "MANUAL_ASSIGNMENT"
        });
      }
    );

    it(
      "rejects manual roster assignments while the session is RUNNING",
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
              "MANUAL_ASSIGNMENT_NOT_ALLOWED_IN_SESSION_STATUS"
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
      "rolls back roster and credits when the player update fails",
      () => {
        seedBase();

        const realPlayerRepository =
          new SqlitePlayerRepository();

        const service =
          new ManualRosterAssignmentService(
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
            contractYear: 2
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
