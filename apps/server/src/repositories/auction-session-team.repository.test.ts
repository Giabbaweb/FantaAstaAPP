import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db,
  sqlite
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
    it(
      "reorders session teams atomically while preserving persistence ids",
      async () => {
        const leagueId =
          "league-session-team-reorder";
        const sessionId =
          "session-team-reorder";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Session Team Reorder League",
          normalizedName:
            "session team reorder league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 81,
            initialCredits: 300
          });

        await db.insert(teams).values([
          {
            id: "team-reorder-a",
            leagueId,
            name: "Team A"
          },
          {
            id: "team-reorder-b",
            leagueId,
            name: "Team B"
          },
          {
            id: "team-reorder-c",
            leagueId,
            name: "Team C"
          }
        ]);

        await db
          .insert(auctionSessionTeams)
          .values([
            {
              id: "session-team-reorder-a",
              auctionSessionId:
                sessionId,
              teamId:
                "team-reorder-a",
              tableOrder: 1,
              renewalCredits: 0,
              remainingCredits: 300
            },
            {
              id: "session-team-reorder-b",
              auctionSessionId:
                sessionId,
              teamId:
                "team-reorder-b",
              tableOrder: 2,
              renewalCredits: 0,
              remainingCredits: 300
            },
            {
              id: "session-team-reorder-c",
              auctionSessionId:
                sessionId,
              teamId:
                "team-reorder-c",
              tableOrder: 3,
              renewalCredits: 0,
              remainingCredits: 300
            }
          ]);

        const reordered =
          await repository.reorder(
            sessionId,
            [
              "team-reorder-b",
              "team-reorder-a",
              "team-reorder-c"
            ]
          );

        expect(
          reordered.map(
            (record) => ({
              teamId: record.teamId,
              tableOrder:
                record.tableOrder
            })
          )
        ).toEqual([
          {
            teamId: "team-reorder-b",
            tableOrder: 1
          },
          {
            teamId: "team-reorder-a",
            tableOrder: 2
          },
          {
            teamId: "team-reorder-c",
            tableOrder: 3
          }
        ]);

        const persisted =
          sqlite
            .prepare(`
              SELECT
                id,
                team_id AS teamId,
                table_order AS tableOrder
              FROM auction_session_teams
              WHERE auction_session_id = ?
              ORDER BY table_order
            `)
            .all(sessionId);

        expect(persisted).toEqual([
          {
            id:
              "session-team-reorder-b",
            teamId:
              "team-reorder-b",
            tableOrder: 1
          },
          {
            id:
              "session-team-reorder-a",
            teamId:
              "team-reorder-a",
            tableOrder: 2
          },
          {
            id:
              "session-team-reorder-c",
            teamId:
              "team-reorder-c",
            tableOrder: 3
          }
        ]);

        const index =
          sqlite
            .prepare(`
              SELECT name
              FROM sqlite_master
              WHERE type = 'index'
                AND name =
                  'auction_session_teams_table_order_unique'
            `)
            .get();

        expect(index).toEqual({
          name:
            "auction_session_teams_table_order_unique"
        });
      }
    );

  }
);
