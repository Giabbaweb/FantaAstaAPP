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

});
