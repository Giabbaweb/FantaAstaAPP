import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionSessionTeams,
  auctionSessions,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import {
  buildApp
} from "../app.js";

describe(
  "auction call creation route",
  () => {
    const auctionSessionId =
      "session-create-route";

    let app:
      Awaited<ReturnType<typeof buildApp>>;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(async () => {
      await db.insert(leagues).values({
        id: "league-create-route",
        name: "League Create Route",
        normalizedName:
          "league create route"
      });

      await db.insert(auctionSessions).values({
        id: auctionSessionId,
        leagueId:
          "league-create-route",
        season: "2026/2027",
        editionNumber: 35,
        status: "RUNNING",
        initialCredits: 300,
        stateVersion: 0
      });

      for (const order of [1, 2]) {
        await db.insert(teams).values({
          id: `route-team-${order}`,
          leagueId:
            "league-create-route",
          name:
            `Route Team ${order}`
        });

        await db
          .insert(auctionSessionTeams)
          .values({
            id:
              `route-session-team-${order}`,
            auctionSessionId,
            teamId:
              `route-team-${order}`,
            tableOrder: order,
            renewalCredits: 0,
            remainingCredits: 300
          });
      }

      await db.insert(players).values({
        id: "route-player-1",
        auctionSessionId,
        fmsCode: "100002",
        name: "Route Player",
        normalizedName:
          "route player",
        role: "A",
        availabilityStatus:
          "AVAILABLE"
      });
    });

    function payload(
      overrides: Record<string, unknown> = {}
    ) {
      return {
        auctionCallId:
          "route-call-1",
        commandId:
          "route-create-command",
        stateVersion: 0,
        playerFmsCode:
          "100002",
        callerAuctionSessionTeamId:
          "route-session-team-1",
        ...overrides
      };
    }

    it(
      "creates a DRAFT with HTTP 201",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${auctionSessionId}/auction-calls`,
            payload: payload()
          });

        expect(response.statusCode).toBe(201);

        const body =
          response.json();

        expect(body).toMatchObject({
          stateVersion: 1,
          idempotentReplay: false,
          error: null,
          data: {
            call: {
              id: "route-call-1",
              auctionSessionId,
              playerId:
                "route-player-1",
              callerAuctionSessionTeamId:
                "route-session-team-1",
              status: "DRAFT"
            }
          }
        });

      }
    );

    it(
      "returns HTTP 200 for an identical replay",
      async () => {
        const first =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${auctionSessionId}/auction-calls`,
            payload: payload()
          });

        expect(first.statusCode).toBe(201);

        const replay =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${auctionSessionId}/auction-calls`,
            payload: payload()
          });

        expect(replay.statusCode).toBe(200);

        expect(
          replay.json()
        ).toMatchObject({
          stateVersion: 1,
          idempotentReplay: true,
          error: null
        });

      }
    );

    it(
      "rejects invalid payload with HTTP 400",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${auctionSessionId}/auction-calls`,
            payload:
              payload({
                playerFmsCode: ""
              })
          });

        expect(response.statusCode).toBe(400);

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
      "returns HTTP 404 for a missing FMS player",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${auctionSessionId}/auction-calls`,
            payload:
              payload({
                playerFmsCode:
                  "DOES-NOT-EXIST"
              })
          });

        expect(response.statusCode).toBe(404);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code:
              "PLAYER_NOT_FOUND"
          }
        });

      }
    );

    it(
      "returns HTTP 409 when the session is not RUNNING",
      async () => {
        await db
          .update(auctionSessions)
          .set({
            status: "SUSPENDED"
          });

        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${auctionSessionId}/auction-calls`,
            payload: payload()
          });

        expect(response.statusCode).toBe(409);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code:
              "AUCTION_SESSION_NOT_RUNNING"
          }
        });

      }
    );

    it(
      "returns HTTP 409 for stale stateVersion",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${auctionSessionId}/auction-calls`,
            payload:
              payload({
                stateVersion: 1
              })
          });

        expect(response.statusCode).toBe(409);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code: "STALE_STATE"
          }
        });

      }
    );
  }
);
