import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionCalls,
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
  SetupDataResetService,
  SetupDataResetServiceError
} from "./setup-data-reset.service.js";

const leagueId =
  "league-setup-data-reset-test";
const sessionId =
  "session-setup-data-reset-test";
const teamId =
  "team-setup-data-reset-test";
const sessionTeamId =
  "session-team-setup-data-reset-test";
const playerId =
  "player-setup-data-reset-test";
const rosterEntryId =
  "roster-setup-data-reset-test";

const service =
  new SetupDataResetService(
    new SqliteAuctionSessionRepository(),
    new SqliteAuctionSessionTeamRepository(),
    new SqliteRosterEntryRepository(),
    new SqlitePlayerRepository()
  );

async function createFixture(
  status:
    | "SETUP"
    | "READY" = "SETUP"
): Promise<void> {
  await db.insert(leagues).values({
    id: leagueId,
    name: "Setup Reset League",
    normalizedName:
      "setup reset league"
  });

  await db.insert(auctionSessions).values({
    id: sessionId,
    leagueId,
    season: "2026/2027",
    editionNumber: 91,
    status,
    initialCredits: 300
  });

  await db.insert(teams).values({
    id: teamId,
    leagueId,
    name: "Setup Reset Team"
  });

  await db
    .insert(auctionSessionTeams)
    .values({
      id: sessionTeamId,
      auctionSessionId: sessionId,
      teamId,
      tableOrder: 1,
      renewalCredits: 17,
      remainingCredits: 265
    });

  await db.insert(players).values({
    id: playerId,
    auctionSessionId: sessionId,
    fmsCode: "RESET-001",
    name: "Reset Player",
    normalizedName: "reset player",
    role: "A",
    availabilityStatus: "ROSTERED"
  });

  await db.insert(rosterEntries).values({
    id: rosterEntryId,
    auctionSessionTeamId:
      sessionTeamId,
    playerId,
    acquisitionCost: 35,
    contractYear: 1,
    source: "INITIAL_ROSTER"
  });
}

afterEach(async () => {
  await db
    .delete(rosterEntries)
    .where(
      eq(
        rosterEntries
          .auctionSessionTeamId,
        sessionTeamId
      )
    );

  await db
    .delete(players)
    .where(
      eq(
        players.auctionSessionId,
        sessionId
      )
    );

  await db
    .delete(auctionSessionTeams)
    .where(
      eq(
        auctionSessionTeams
          .auctionSessionId,
        sessionId
      )
    );

  await db
    .delete(teams)
    .where(eq(teams.id, teamId));

  await db
    .delete(auctionSessions)
    .where(
      eq(
        auctionSessions.id,
        sessionId
      )
    );

  await db
    .delete(leagues)
    .where(eq(leagues.id, leagueId));
});

describe(
  "SetupDataResetService",
  () => {
    it(
      "deletes roster and players and restores credits in SETUP",
      async () => {
        await createFixture();

        const result =
          service.execute(sessionId);

        expect(result).toEqual({
          deletedRosterEntries: 1,
          deletedPlayers: 1,
          resetTeams: 1
        });

        const storedRosterEntries =
          await db
            .select()
            .from(rosterEntries)
            .where(
              eq(
                rosterEntries
                  .auctionSessionTeamId,
                sessionTeamId
              )
            );

        expect(
          storedRosterEntries
        ).toHaveLength(0);

        const storedPlayers =
          await db
            .select()
            .from(players)
            .where(
              eq(
                players.auctionSessionId,
                sessionId
              )
            );

        expect(
          storedPlayers
        ).toHaveLength(0);

        const [storedSessionTeam] =
          await db
            .select()
            .from(auctionSessionTeams)
            .where(
              eq(
                auctionSessionTeams.id,
                sessionTeamId
              )
            );

        expect(
          storedSessionTeam
            ?.remainingCredits
        ).toBe(300);

        /*
         * renewalCredits is configuration:
         * reset must not alter it.
         */
        expect(
          storedSessionTeam
            ?.renewalCredits
        ).toBe(17);
      }
    );

    it(
      "rejects reset in SETUP when operational history exists",
      async () => {
        await createFixture("SETUP");

        await db.insert(auctionCalls).values({
          id:
            "call-setup-data-reset-test",
          auctionSessionId:
            sessionId,
          playerId,
          callerAuctionSessionTeamId:
            sessionTeamId,
          status:
            "CANCELLED",
          openingBid: 1,
          currentBid: 1
        });

        try {
          expect(() =>
            service.execute(sessionId)
          ).toThrowError(
            expect.objectContaining({
              code:
                "OPERATIONAL_DATA_EXISTS"
            })
          );

          const storedPlayers =
            await db
              .select()
              .from(players)
              .where(
                eq(
                  players.auctionSessionId,
                  sessionId
                )
              );

          expect(
            storedPlayers
          ).toHaveLength(1);

          const storedRosterEntries =
            await db
              .select()
              .from(rosterEntries)
              .where(
                eq(
                  rosterEntries
                    .auctionSessionTeamId,
                  sessionTeamId
                )
              );

          expect(
            storedRosterEntries
          ).toHaveLength(1);

          const [storedSessionTeam] =
            await db
              .select()
              .from(auctionSessionTeams)
              .where(
                eq(
                  auctionSessionTeams.id,
                  sessionTeamId
                )
              );

          expect(
            storedSessionTeam
              ?.remainingCredits
          ).toBe(265);
        } finally {
          await db
            .delete(auctionCalls)
            .where(
              eq(
                auctionCalls.id,
                "call-setup-data-reset-test"
              )
            );
        }
      }
    );

    it(
      "rejects reset outside SETUP without changing data",
      async () => {
        await createFixture("READY");

        expect(() =>
          service.execute(sessionId)
        ).toThrowError(
          expect.objectContaining({
            code:
              "INVALID_SESSION_STATUS"
          })
        );

        const storedPlayers =
          await db
            .select()
            .from(players)
            .where(
              eq(
                players.auctionSessionId,
                sessionId
              )
            );

        expect(
          storedPlayers
        ).toHaveLength(1);

        const storedRosterEntries =
          await db
            .select()
            .from(rosterEntries)
            .where(
              eq(
                rosterEntries
                  .auctionSessionTeamId,
                sessionTeamId
              )
            );

        expect(
          storedRosterEntries
        ).toHaveLength(1);

        const [storedSessionTeam] =
          await db
            .select()
            .from(auctionSessionTeams)
            .where(
              eq(
                auctionSessionTeams.id,
                sessionTeamId
              )
            );

        expect(
          storedSessionTeam
            ?.remainingCredits
        ).toBe(265);
      }
    );

    it(
      "rejects a missing auction session",
      () => {
        expect(() =>
          service.execute(
            "missing-setup-session"
          )
        ).toThrowError(
          expect.objectContaining({
            code:
              "AUCTION_SESSION_NOT_FOUND"
          })
        );
      }
    );
  }
);
