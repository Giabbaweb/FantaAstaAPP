import {
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
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
  InitialRosterResetService,
  InitialRosterResetServiceError
} from "./initial-roster-reset.service.js";

const leagueId =
  "league-initial-roster-reset-test";
const sessionId =
  "session-initial-roster-reset-test";
const teamId =
  "team-initial-roster-reset-test";
const sessionTeamId =
  "session-team-initial-roster-reset-test";

async function cleanup(): Promise<void> {
  await db.delete(rosterEntries);
  await db.delete(players);
  await db.delete(auctionSessionTeams);
  await db.delete(teams);
  await db.delete(auctionSessions);
  await db.delete(leagues);
}

async function createFixture(
  status:
    | "SETUP"
    | "READY" = "SETUP"
): Promise<void> {
  await cleanup();

  await db.insert(leagues).values({
    id: leagueId,
    name: "Initial Roster Reset Test",
    normalizedName:
      "initial roster reset test"
  });

  await db.insert(auctionSessions).values({
    id: sessionId,
    leagueId,
    season: "2026/2027",
    editionNumber: 94,
    status,
    initialCredits: 300
  });

  await db.insert(teams).values({
    id: teamId,
    leagueId,
    name: "Reset Team"
  });

  await db.insert(auctionSessionTeams).values({
    id: sessionTeamId,
    auctionSessionId: sessionId,
    teamId,
    tableOrder: 1,
    renewalCredits: 0,
    remainingCredits: 250
  });

  await db.insert(players).values([
    {
      id: "reset-player-rostered",
      auctionSessionId: sessionId,
      fmsCode: "RESET-001",
      name: "Rostered Player",
      normalizedName:
        "rostered player",
      realTeamName: "Inter",
      role: "A",
      availabilityStatus:
        "ROSTERED"
    },
    {
      id: "reset-player-available",
      auctionSessionId: sessionId,
      fmsCode: "RESET-002",
      name: "Available Player",
      normalizedName:
        "available player",
      realTeamName: "Milan",
      role: "D",
      availabilityStatus:
        "AVAILABLE"
    }
  ]);

  await db.insert(rosterEntries).values({
    id: "reset-roster-entry",
    auctionSessionTeamId:
      sessionTeamId,
    playerId:
      "reset-player-rostered",
    acquisitionCost: 50,
    contractYear: 2,
    source: "INITIAL_ROSTER"
  });
}

function createService() {
  return new InitialRosterResetService(
    new SqliteAuctionSessionRepository(),
    new SqliteAuctionSessionTeamRepository(),
    new SqliteRosterEntryRepository(),
    new SqlitePlayerRepository()
  );
}

describe(
  "InitialRosterResetService",
  () => {
    it(
      "resets only initial rosters while preserving the player archive",
      async () => {
        await createFixture();

        try {
          const result =
            createService().execute(
              sessionId
            );

          expect(result).toEqual({
            deletedRosterEntries: 1,
            resetPlayers: 1,
            resetTeams: 1
          });

          const storedPlayers =
            await db
              .select()
              .from(players);

          expect(
            storedPlayers
          ).toHaveLength(2);

          expect(
            storedPlayers.find(
              (player) =>
                player.id ===
                "reset-player-rostered"
            )?.availabilityStatus
          ).toBe("AVAILABLE");

          expect(
            storedPlayers.find(
              (player) =>
                player.id ===
                "reset-player-available"
            )?.availabilityStatus
          ).toBe("AVAILABLE");

          const storedRosterEntries =
            await db
              .select()
              .from(rosterEntries);

          expect(
            storedRosterEntries
          ).toHaveLength(0);

          const [storedSessionTeam] =
            await db
              .select()
              .from(
                auctionSessionTeams
              );

          expect(
            storedSessionTeam
              ?.remainingCredits
          ).toBe(300);
        } finally {
          await cleanup();
        }
      }
    );

    it(
      "rejects reset outside SETUP",
      async () => {
        await createFixture("READY");

        try {
          expect(() =>
            createService().execute(
              sessionId
            )
          ).toThrowError(
            expect.objectContaining({
              code:
                "INVALID_SESSION_STATUS"
            })
          );

          const storedRosterEntries =
            await db
              .select()
              .from(rosterEntries);

          expect(
            storedRosterEntries
          ).toHaveLength(1);
        } finally {
          await cleanup();
        }
      }
    );

    it(
      "rejects a missing auction session",
      async () => {
        await cleanup();

        try {
          expect(() =>
            createService().execute(
              "missing-session"
            )
          ).toThrowError(
            expect.objectContaining({
              code:
                "AUCTION_SESSION_NOT_FOUND"
            })
          );
        } finally {
          await cleanup();
        }
      }
    );
  }
);
