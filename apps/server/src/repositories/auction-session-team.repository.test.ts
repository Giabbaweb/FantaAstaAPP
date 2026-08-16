import {
  afterEach,
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
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionSessionTeamRepository
} from "./auction-session-team.repository.js";

const repository =
  new SqliteAuctionSessionTeamRepository();

afterEach(async () => {
  await db.delete(auctionSessionTeams);
  await db.delete(teams);
  await db.delete(auctionSessions);
  await db.delete(leagues);
});

describe(
  "SqliteAuctionSessionTeamRepository",
  () => {
    it("finds persistence records by auction session ordered by table order", async () => {
      const leagueId =
        "league-session-team-repository";
      const sessionId =
        "session-team-repository";

      await db.insert(leagues).values({
        id: leagueId,
        name:
          "Session Team Repository League",
        normalizedName:
          "session team repository league"
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber: 80,
        initialCredits: 300
      });

      await db.insert(teams).values([
        {
          id: "team-table-order-2",
          leagueId,
          name: "Team Two"
        },
        {
          id: "team-table-order-1",
          leagueId,
          name: "Team One"
        }
      ]);

      await db
        .insert(auctionSessionTeams)
        .values([
          {
            id:
              "session-team-table-order-2",
            auctionSessionId:
              sessionId,
            teamId:
              "team-table-order-2",
            tableOrder: 2,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            id:
              "session-team-table-order-1",
            auctionSessionId:
              sessionId,
            teamId:
              "team-table-order-1",
            tableOrder: 1,
            renewalCredits: 0,
            remainingCredits: 300
          }
        ]);

      const result =
        db.transaction((tx) =>
          repository
            .findByAuctionSessionIdWithExecutor(
              tx,
              sessionId
            )
        );

      expect(
        result.map(
          (record) => ({
            id: record.id,
            teamId: record.teamId,
            tableOrder:
              record.tableOrder
          })
        )
      ).toEqual([
        {
          id:
            "session-team-table-order-1",
          teamId:
            "team-table-order-1",
          tableOrder: 1
        },
        {
          id:
            "session-team-table-order-2",
          teamId:
            "team-table-order-2",
          tableOrder: 2
        }
      ]);
    });
  }
);
