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
  SqliteRosterEntryRepository
} from "./roster-entry.repository.js";

const leagueId = "league-roster-repository-test";
const auctionSessionId =
  "session-roster-repository-test";
const teamId = "team-roster-repository-test";
const auctionSessionTeamId =
  "session-team-roster-repository-test";
const playerId = "player-roster-repository-test";

describe("SqliteRosterEntryRepository", () => {
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
      .where(eq(players.id, playerId))
      .run();

    db.delete(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.id,
          auctionSessionTeamId
        )
      )
      .run();

    db.delete(teams)
      .where(eq(teams.id, teamId))
      .run();

    db.delete(auctionSessions)
      .where(eq(auctionSessions.id, auctionSessionId))
      .run();

    db.delete(leagues)
      .where(eq(leagues.id, leagueId))
      .run();
  });

  it(
    "creates and reads a roster entry inside a transaction",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Roster Repository Test League",
          normalizedName:
            "roster repository test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 98,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Roster Repository Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 330
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "ROSTER-TEST-001",
          name: "Roster Test Player",
          normalizedName: "roster test player",
          role: "A",
          availabilityStatus: "AVAILABLE"
        })
        .run();

      const repository =
        new SqliteRosterEntryRepository();

      db.transaction((tx) => {
        const created =
          repository.createWithExecutor(tx, {
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 25,
            contractYear: 1,
            source: "AUCTION"
          });

        expect(created).toMatchObject({
          auctionSessionTeamId,
          playerId,
          acquisitionCost: 25,
          contractYear: 1,
          source: "AUCTION"
        });

        const foundByPlayer =
          repository.findByPlayerIdWithExecutor(
            tx,
            playerId
          );

        expect(foundByPlayer).toEqual(created);

        const teamRoster =
          repository
            .findByAuctionSessionTeamIdWithExecutor(
              tx,
              auctionSessionTeamId
            );

        expect(teamRoster).toEqual([created]);
      });
    }
  );
});
