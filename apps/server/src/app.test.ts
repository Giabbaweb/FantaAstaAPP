import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import {
  APPLICATION_NAME
} from "@fantaastaapp/domain";

import {
  buildApp
} from "./app.js";
import {
  db
} from "./db/client.js";
import {
  auctionSessions,
  leagues
} from "./db/schema/index.js";

describe("application integration", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/health", () => {
    it("returns the application health status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/health"
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        status: string;
        application: string;
        timestamp: string;
      }>();

      expect(body).toEqual({
        status: "ok",
        application: APPLICATION_NAME,
        timestamp: expect.any(String)
      });

      expect(
        Number.isNaN(Date.parse(body.timestamp))
      ).toBe(false);
    });
  });

  describe("GET /api/db-health", () => {
    it("returns the database health status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/db-health"
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        status: string;
        database: string;
        timestamp: string;
      }>();

      expect(body.status).toBe("ok");
      expect(body.database).toBe("fantaasta.test.sqlite");

      expect(
        Number.isNaN(Date.parse(body.timestamp))
      ).toBe(false);
    });
  });

  describe("GET /api/auction-sessions/:id", () => {
    it("returns the requested auction session", async () => {
      await db.insert(leagues).values({
        id: "league-sfl92",
        name: "Scotch Football League 1992",
        normalizedName: "scotch football league 1992"
      });

      await db.insert(auctionSessions).values({
        id: "session-2026-2027",
        leagueId: "league-sfl92",
        season: "2026/2027",
        editionNumber: 35,
        initialCredits: 330
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/auction-sessions/session-2026-2027"
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        data: {
          id: string;
          leagueId: string;
          season: string;
          editionNumber: number;
          status: string;
          initialCredits: number;
          createdAt: string;
          updatedAt: string;
        };
        error: null;
      }>();

      expect(body.error).toBeNull();

      expect(body.data).toEqual({
        id: "session-2026-2027",
        leagueId: "league-sfl92",
        season: "2026/2027",
        editionNumber: 35,
        status: "SETUP",
        initialCredits: 330,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });
    it("returns 404 when the auction session does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auction-sessions/missing-session"
      });

      expect(response.statusCode).toBe(404);

      const body = response.json<{
        data: null;
        error: {
          code: string;
          message: string;
        };
      }>();

      expect(body).toEqual({
        data: null,
        error: {
          code: "AUCTION_SESSION_NOT_FOUND",
          message:
            'Auction session "missing-session" was not found'
        }
      });
    });
  });

  describe("GET /api/auction-sessions", () => {
    it("returns an empty auction session list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auction-sessions"
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        data: unknown[];
        error: null;
      }>();

      expect(body.error).toBeNull();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(0);
    });

    it("returns the available auction sessions", async () => {
      await db.insert(leagues).values({
        id: "league-sfl92",
        name: "Scotch Football League 1992",
        normalizedName: "scotch football league 1992"
      });

      await db.insert(auctionSessions).values({
        id: "session-2026-2027",
        leagueId: "league-sfl92",
        season: "2026/2027",
        editionNumber: 35,
        initialCredits: 330
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/auction-sessions"
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        data: Array<{
          id: string;
          leagueId: string;
          season: string;
          editionNumber: number;
          status: string;
          initialCredits: number;
          createdAt: string;
          updatedAt: string;
        }>;
        error: null;
      }>();

      expect(body.error).toBeNull();
      expect(body.data).toHaveLength(1);

      expect(body.data[0]).toEqual({
        id: "session-2026-2027",
        leagueId: "league-sfl92",
        season: "2026/2027",
        editionNumber: 35,
        status: "SETUP",
        initialCredits: 330,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });
  });
  describe("POST /api/auction-sessions", () => {
    it("creates a new auction session", async () => {
      await db.insert(leagues).values({
        id: "league-sfl92",
        name: "Scotch Football League 1992",
        normalizedName: "scotch football league 1992"
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/auction-sessions",
        payload: {
          leagueId: "league-sfl92",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330
        }
      });

      expect(response.statusCode).toBe(201);

      const body = response.json<{
        data: {
          id: string;
          leagueId: string;
          season: string;
          editionNumber: number;
          status: string;
          initialCredits: number;
          createdAt: string;
          updatedAt: string;
        };
        error: null;
      }>();

      expect(body.error).toBeNull();

      expect(body.data).toEqual({
        id: expect.any(String),
        leagueId: "league-sfl92",
        season: "2026/2027",
        editionNumber: 35,
        status: "SETUP",
        initialCredits: 330,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      const stored =
        await db.query.auctionSessions.findFirst({
          where: (table, { eq }) =>
            eq(table.id, body.data.id)
        });

      expect(stored).not.toBeNull();
      expect(stored?.leagueId).toBe("league-sfl92");
      expect(stored?.season).toBe("2026/2027");
    });

    it("returns 400 for an empty payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auction-sessions",
        payload: {}
      });

      expect(response.statusCode).toBe(400);

      const body = response.json<{
        data: null;
        error: {
          code: string;
          message: string;
        };
      }>();

      expect(body.data).toBeNull();
      expect(body.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 400 when season is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auction-sessions",
        payload: {
          leagueId: "league-sfl92",
          season: "",
          editionNumber: 35,
          initialCredits: 330
        }
      });

      expect(response.statusCode).toBe(400);

      const body = response.json<{
        data: null;
        error: {
          code: string;
          message: string;
        };
      }>();

      expect(body.data).toBeNull();
      expect(body.error.code).toBe("INVALID_REQUEST");
    });

    it(
      "returns 400 when edition number is not positive",
      async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/auction-sessions",
          payload: {
            leagueId: "league-sfl92",
            season: "2026/2027",
            editionNumber: 0,
            initialCredits: 330
          }
        });

        expect(response.statusCode).toBe(400);

        const body = response.json<{
          data: null;
          error: {
            code: string;
            message: string;
          };
        }>();

        expect(body.data).toBeNull();
        expect(body.error.code).toBe(
          "INVALID_REQUEST"
        );
      }
    );

    it(
      "returns 400 when initial credits are negative",
      async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/auction-sessions",
          payload: {
            leagueId: "league-sfl92",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: -1
          }
        });

        expect(response.statusCode).toBe(400);

        const body = response.json<{
          data: null;
          error: {
            code: string;
            message: string;
          };
        }>();

        expect(body.data).toBeNull();
        expect(body.error.code).toBe(
          "INVALID_REQUEST"
        );
      }
    );
    it(
      "returns 409 when the league does not exist",
      async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/auction-sessions",
          payload: {
            leagueId: "missing-league",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code:
              "AUCTION_SESSION_LEAGUE_NOT_FOUND",
            message:
              "The selected league does not exist"
          }
        });
      }
    );

    it(
      "returns 409 when the league and season already exist",
      async () => {
        await db.insert(leagues).values({
          id: "league-sfl92",
          name: "Scotch Football League 1992",
          normalizedName:
            "scotch football league 1992"
        });

        await db.insert(auctionSessions).values({
          id: "existing-season-session",
          leagueId: "league-sfl92",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330
        });

        const response = await app.inject({
          method: "POST",
          url: "/api/auction-sessions",
          payload: {
            leagueId: "league-sfl92",
            season: "2026/2027",
            editionNumber: 36,
            initialCredits: 330
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code:
              "AUCTION_SESSION_SEASON_ALREADY_EXISTS",
            message:
              "An auction session already exists for this league and season"
          }
        });
      }
    );

    it(
      "returns 409 when the league and edition number already exist",
      async () => {
        await db.insert(leagues).values({
          id: "league-sfl92",
          name: "Scotch Football League 1992",
          normalizedName:
            "scotch football league 1992"
        });

        await db.insert(auctionSessions).values({
          id: "existing-edition-session",
          leagueId: "league-sfl92",
          season: "2025/2026",
          editionNumber: 35,
          initialCredits: 330
        });

        const response = await app.inject({
          method: "POST",
          url: "/api/auction-sessions",
          payload: {
            leagueId: "league-sfl92",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code:
              "AUCTION_SESSION_EDITION_ALREADY_EXISTS",
            message:
              "An auction session already exists for this league and edition number"
          }
        });
      }
    );
  });
});
