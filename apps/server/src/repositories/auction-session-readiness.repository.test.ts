import {
  beforeEach,
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
  SqliteAuctionSessionReadinessRepository
} from "./auction-session-readiness.repository.js";

describe(
  "SqliteAuctionSessionReadinessRepository",
  () => {
    const leagueId =
      "league-readiness-repository";
    const sessionId =
      "session-readiness-repository";
    const teamId =
      "team-readiness-repository";
    const sessionTeamId =
      "session-team-readiness-repository";

    let repository:
      SqliteAuctionSessionReadinessRepository;

    beforeEach(async () => {
      repository =
        new SqliteAuctionSessionReadinessRepository();

      await db.insert(leagues).values({
        id: leagueId,
        name: "Readiness Repository League",
        normalizedName:
          "readiness repository league"
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber: 1,
        status: "SUSPENDED",
        initialCredits: 300,
        maximumInitialRosterEntries: 11,
        stateVersion: 1
      });

      await db.insert(teams).values({
        id: teamId,
        leagueId,
        name: "Readiness Team"
      });

      await db
        .insert(auctionSessionTeams)
        .values({
          id: sessionTeamId,
          auctionSessionId: sessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 300
        });
    });

    it(
      "counts only INITIAL_ROSTER entries for readiness",
      async () => {
        const playerRows:
          Array<
            typeof players.$inferInsert
          > = [];

        const rosterRows:
          Array<
            typeof rosterEntries.$inferInsert
          > = [];

        for (
          let index = 1;
          index <= 12;
          index += 1
        ) {
          const playerId =
            `readiness-player-${index}`;

          playerRows.push({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode:
              `READINESS-${index}`,
            name:
              `READINESS PLAYER ${index}`,
            normalizedName:
              `readiness player ${index}`,
            role: "C",
            availabilityStatus:
              "ROSTERED"
          });

          rosterRows.push({
            id:
              `readiness-roster-${index}`,
            auctionSessionTeamId:
              sessionTeamId,
            playerId,
            acquisitionCost: 1,
            contractYear: 1,
            source:
              index <= 11
                ? "INITIAL_ROSTER"
                : "AUCTION"
          });
        }

        await db
          .insert(players)
          .values(playerRows);

        await db
          .insert(rosterEntries)
          .values(rosterRows);

        const snapshot =
          await repository.inspect(
            sessionId
          );

        expect(
          snapshot
            .rosterEntrySessionTeamIds
        ).toHaveLength(11);

        expect(
          snapshot
            .rosterEntrySessionTeamIds
            .every(
              (id) =>
                id === sessionTeamId
            )
        ).toBe(true);
      }
    );
  }
);
