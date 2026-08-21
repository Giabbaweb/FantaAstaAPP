import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  buildApp
} from "../app.js";
import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  leagues,
  teams
} from "../db/schema/index.js";

describe(
  "auction session team routes",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    const leagueId =
      "league-session-team-route";
    const sessionId =
      "session-team-route";

    beforeAll(async () => {
      app = await buildApp();
    });

    beforeEach(async () => {
      await db.insert(leagues).values({
        id: leagueId,
        name:
          "Session Team Route League",
        normalizedName:
          "session team route league"
      });

      await db
        .insert(auctionSessions)
        .values({
          id: sessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 82,
          initialCredits: 300
        });

      await db.insert(teams).values([
        {
          id: "team-route-a",
          leagueId,
          name: "Team A"
        },
        {
          id: "team-route-b",
          leagueId,
          name: "Team B"
        },
        {
          id: "team-route-c",
          leagueId,
          name: "Team C"
        }
      ]);

      await db
        .insert(auctionSessionTeams)
        .values([
          {
            id:
              "session-team-route-a",
            auctionSessionId:
              sessionId,
            teamId:
              "team-route-a",
            tableOrder: 1,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            id:
              "session-team-route-b",
            auctionSessionId:
              sessionId,
            teamId:
              "team-route-b",
            tableOrder: 2,
            renewalCredits: 0,
            remainingCredits: 300
          },
          {
            id:
              "session-team-route-c",
            auctionSessionId:
              sessionId,
            teamId:
              "team-route-c",
            tableOrder: 3,
            renewalCredits: 0,
            remainingCredits: 300
          }
        ]);
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "reorders session teams through HTTP",
      async () => {
        const response =
          await app.inject({
            method: "PUT",
            url:
              `/api/auction-sessions/${sessionId}/teams/reorder`,
            payload: {
              teamIds: [
                "team-route-b",
                "team-route-a",
                "team-route-c"
              ]
            }
          });

        expect(
          response.statusCode
        ).toBe(200);

        expect(
          response.json()
        ).toEqual({
          data: [
            {
              auctionSessionId:
                sessionId,
              teamId:
                "team-route-b",
              tableOrder: 1,
              renewalCredits: 0,
              remainingCredits: 300
            },
            {
              auctionSessionId:
                sessionId,
              teamId:
                "team-route-a",
              tableOrder: 2,
              renewalCredits: 0,
              remainingCredits: 300
            },
            {
              auctionSessionId:
                sessionId,
              teamId:
                "team-route-c",
              tableOrder: 3,
              renewalCredits: 0,
              remainingCredits: 300
            }
          ],
          error: null
        });
      }
    );

    it(
      "rejects reorder when a participating team is missing",
      async () => {
        const response =
          await app.inject({
            method: "PUT",
            url:
              `/api/auction-sessions/${sessionId}/teams/reorder`,
            payload: {
              teamIds: [
                "team-route-a",
                "team-route-b"
              ]
            }
          });

        expect(
          response.statusCode
        ).toBe(400);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code:
              "AUCTION_SESSION_TEAM_REORDER_INVALID"
          }
        });
      }
    );

    it(
      "rejects duplicate team ids at contract validation",
      async () => {
        const response =
          await app.inject({
            method: "PUT",
            url:
              `/api/auction-sessions/${sessionId}/teams/reorder`,
            payload: {
              teamIds: [
                "team-route-a",
                "team-route-a",
                "team-route-c"
              ]
            }
          });

        expect(
          response.statusCode
        ).toBe(400);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code:
              "INVALID_REQUEST"
          }
        });
      }
    );

    it(
      "preserves persistence ids after reorder",
      async () => {
        await app.inject({
          method: "PUT",
          url:
            `/api/auction-sessions/${sessionId}/teams/reorder`,
          payload: {
            teamIds: [
              "team-route-c",
              "team-route-b",
              "team-route-a"
            ]
          }
        });

        const rows =
          await db
            .select({
              id:
                auctionSessionTeams.id,
              teamId:
                auctionSessionTeams.teamId,
              tableOrder:
                auctionSessionTeams.tableOrder
            })
            .from(
              auctionSessionTeams
            );

        expect(rows).toEqual(
          expect.arrayContaining([
            {
              id:
                "session-team-route-a",
              teamId:
                "team-route-a",
              tableOrder: 3
            },
            {
              id:
                "session-team-route-b",
              teamId:
                "team-route-b",
              tableOrder: 2
            },
            {
              id:
                "session-team-route-c",
              teamId:
                "team-route-c",
              tableOrder: 1
            }
          ])
        );
      }
    );
  }
);
