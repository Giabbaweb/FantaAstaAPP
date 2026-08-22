import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import {
  eq
} from "drizzle-orm";

import {
  APPLICATION_NAME
} from "@fantaastaapp/domain";

import {
  buildApp
} from "./app.js";
import {
  db,
  sqlite
} from "./db/client.js";
import {
  auctionCalls,
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  commandRegistry,
  leagues,
  players,
  rosterEntries,
  teams
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

  describe("League API", () => {
    it("creates, lists, gets and updates a league", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/leagues",
        payload: {
          name: "  Lega Test M14  "
        }
      });

      expect(createResponse.statusCode).toBe(201);

      const created = createResponse.json<{
        data: {
          id: string;
          name: string;
          createdAt: string;
          updatedAt: string;
        };
        error: null;
      }>();

      expect(created.data.name).toBe(
        "Lega Test M14"
      );

      const leagueId =
        created.data.id;

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/leagues"
      });

      expect(listResponse.statusCode).toBe(200);

      const listBody = listResponse.json<{
        data: Array<{
          id: string;
          name: string;
        }>;
        error: null;
      }>();

      expect(
        listBody.data.some(
          (league) =>
            league.id === leagueId
        )
      ).toBe(true);

      const detailResponse = await app.inject({
        method: "GET",
        url: `/api/leagues/${leagueId}`
      });

      expect(detailResponse.statusCode).toBe(200);

      expect(
        detailResponse.json<{
          data: {
            id: string;
            name: string;
          };
          error: null;
        }>().data
      ).toMatchObject({
        id: leagueId,
        name: "Lega Test M14"
      });

      const updateResponse = await app.inject({
        method: "PATCH",
        url: `/api/leagues/${leagueId}`,
        payload: {
          name: "  Lega   Test   M14   Updated  "
        }
      });

      expect(updateResponse.statusCode).toBe(200);

      expect(
        updateResponse.json<{
          data: {
            id: string;
            name: string;
          };
          error: null;
        }>().data
      ).toMatchObject({
        id: leagueId,
        name: "Lega Test M14 Updated"
      });
    });

    it("returns 404 for an unknown league", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/leagues/missing-league"
      });

      expect(response.statusCode).toBe(404);

      expect(response.json()).toEqual({
        data: null,
        error: {
          code: "LEAGUE_NOT_FOUND",
          message:
            'League "missing-league" was not found'
        }
      });
    });

    it("rejects duplicate league names after normalization", async () => {
      const firstResponse = await app.inject({
        method: "POST",
        url: "/api/leagues",
        payload: {
          name: "Lega Duplicate M14"
        }
      });

      expect(firstResponse.statusCode).toBe(201);

      const secondResponse = await app.inject({
        method: "POST",
        url: "/api/leagues",
        payload: {
          name: "  LEGA   DUPLICATE   M14  "
        }
      });

      expect(secondResponse.statusCode).toBe(409);

      expect(
        secondResponse.json<{
          data: null;
          error: {
            code: string;
            message: string;
          };
        }>()
      ).toMatchObject({
        data: null,
        error: {
          code:
            "LEAGUE_NAME_ALREADY_EXISTS"
        }
      });
    });

    it("rejects an invalid create payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/leagues",
        payload: {
          name: ""
        }
      });

      expect(response.statusCode).toBe(400);

      expect(
        response.json<{
          data: null;
          error: {
            code: string;
          };
        }>()
      ).toMatchObject({
        data: null,
        error: {
          code: "INVALID_REQUEST"
        }
      });
    });
  });

  describe("Team access PIN API", () => {
    it("configures the PIN without storing it in clear text", async () => {
      await db.insert(leagues).values({
        id: "league-team-access-pin",
        name: "League Team Access PIN",
        normalizedName:
          "league team access pin"
      });

      await db.insert(auctionSessions).values({
        id: "session-team-access-pin",
        leagueId:
          "league-team-access-pin",
        season: "2026/2027",
        editionNumber: 501,
        initialCredits: 300
      });

      await db.insert(teams).values({
        id: "team-team-access-pin",
        leagueId:
          "league-team-access-pin",
        name: "Team Access PIN"
      });

      await db.insert(auctionSessionTeams).values({
        id: "session-team-access-pin-1",
        auctionSessionId:
          "session-team-access-pin",
        teamId:
          "team-team-access-pin",
        tableOrder: 1,
        renewalCredits: 0,
        remainingCredits: 300
      });

      const response = await app.inject({
        method: "PUT",
        url:
          "/api/auction-session-teams/session-team-access-pin-1/access-pin",
        payload: {
          pin: "1111"
        }
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe("");

      const [credential] = await db
        .select({
          accessPinHash:
            auctionSessionTeams.accessPinHash
        })
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.id,
            "session-team-access-pin-1"
          )
        );

      expect(credential).toBeDefined();

      expect(
        credential?.accessPinHash
      ).toMatch(/^scrypt\$/);

      expect(
        credential?.accessPinHash
      ).not.toContain("1111");
    });

    it("rejects an invalid PIN", async () => {
      const response = await app.inject({
        method: "PUT",
        url:
          "/api/auction-session-teams/any-session-team/access-pin",
        payload: {
          pin: "123"
        }
      });

      expect(response.statusCode).toBe(400);

      expect(
        response.json<{
          data: null;
          error: {
            code: string;
          };
        }>()
      ).toMatchObject({
        data: null,
        error: {
          code: "INVALID_REQUEST"
        }
      });
    });

    it("rejects a non-numeric PIN", async () => {
      const response = await app.inject({
        method: "PUT",
        url:
          "/api/auction-session-teams/any-session-team/access-pin",
        payload: {
          pin: "abcd"
        }
      });

      expect(response.statusCode).toBe(400);

      expect(
        response.json<{
          data: null;
          error: {
            code: string;
          };
        }>()
      ).toMatchObject({
        data: null,
        error: {
          code: "INVALID_REQUEST"
        }
      });
    });

    it("returns 404 for an unknown auction session team", async () => {
      const response = await app.inject({
        method: "PUT",
        url:
          "/api/auction-session-teams/missing-session-team/access-pin",
        payload: {
          pin: "1111"
        }
      });

      expect(response.statusCode).toBe(404);

      expect(
        response.json<{
          data: null;
          error: {
            code: string;
          };
        }>()
      ).toMatchObject({
        data: null,
        error: {
          code: "TEAM_ACCESS_NOT_FOUND"
        }
      });
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
          suspensionReason: string | null;
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
        suspensionReason: null,
        initialCredits: 330,
        maximumInitialRosterEntries: 11,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(body.data).not.toHaveProperty(
        "stateVersion"
      );
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

  describe("GET /api/auction-sessions/active", () => {
  it("returns the active auction session", async () => {
    await db.insert(leagues).values({
      id: "league-active",
      name: "Active League",
      normalizedName: "active league"
    });

    await db.insert(auctionSessions).values({
      id: "session-active",
      leagueId: "league-active",
      season: "2026/2027",
      editionNumber: 35,
      status: "READY",
      suspensionReason: null,
      initialCredits: 330
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/auction-sessions/active"
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
      } | null;
      error: null;
    }>();

    expect(body.error).toBeNull();

    expect(body.data).toEqual({
      id: "session-active",
      leagueId: "league-active",
      season: "2026/2027",
      editionNumber: 35,
      status: "READY",
      suspensionReason: null,
      initialCredits: 330,
      maximumInitialRosterEntries: 11,
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it("returns null when there is no active auction session", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auction-sessions/active"
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      data: null;
      error: null;
    }>();

    expect(body).toEqual({
      data: null,
      error: null
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
        suspensionReason: null,
        initialCredits: 330,
        maximumInitialRosterEntries: 11,
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
        suspensionReason: null,
        initialCredits: 330,
        maximumInitialRosterEntries: 11,
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

    it(
      "creates a session with a custom maximum initial roster entries value",
      async () => {
        await db.insert(leagues).values({
          id: "league-custom-initial-roster-limit",
          name: "Custom Initial Roster Limit League",
          normalizedName:
            "custom initial roster limit league"
        });

        const response = await app.inject({
          method: "POST",
          url: "/api/auction-sessions",
          payload: {
            leagueId:
              "league-custom-initial-roster-limit",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 8
          }
        });

        expect(response.statusCode).toBe(201);

        expect(response.json()).toEqual({
          data: expect.objectContaining({
            leagueId:
              "league-custom-initial-roster-limit",
            maximumInitialRosterEntries: 8
          }),
          error: null
        });
      }
    );

    it.each([-1, 25])(
      "returns 400 when maximum initial roster entries is %i",
      async (maximumInitialRosterEntries) => {
        const response = await app.inject({
          method: "POST",
          url: "/api/auction-sessions",
          payload: {
            leagueId: "league-sfl92",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries
          }
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "INVALID_REQUEST"
          })
        });
      }
    );

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
  describe("PATCH /api/auction-sessions/:id", () => {
    it(
      "updates an auction session in SETUP",
      async () => {
        await db.insert(leagues).values({
          id: "league-patch-setup",
          name: "Patch Setup League",
          normalizedName: "patch setup league"
        });

        await db.insert(auctionSessions).values({
          id: "session-patch-setup",
          leagueId: "league-patch-setup",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "SETUP"
        });

        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-patch-setup",
          payload: {
            season: "2027/2028",
            editionNumber: 36,
            initialCredits: 350
          }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
          data: expect.objectContaining({
            id: "session-patch-setup",
            leagueId: "league-patch-setup",
            season: "2027/2028",
            editionNumber: 36,
            initialCredits: 350,
            maximumInitialRosterEntries: 11,
            status: "SETUP"
          }),
          error: null
        });
      }
    );

    it(
      "returns 400 when the update payload is empty",
      async () => {
        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-empty-update",
          payload: {}
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "INVALID_REQUEST"
          })
        });
      }
    );

    it(
      "returns 404 when the auction session does not exist",
      async () => {
        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/missing-patch-session",
          payload: {
            initialCredits: 350
          }
        });

        expect(response.statusCode).toBe(404);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "AUCTION_SESSION_NOT_FOUND"
          })
        });
      }
    );

    it(
      "returns 409 when structural fields are changed outside SETUP",
      async () => {
        await db.insert(leagues).values({
          id: "league-patch-structural",
          name: "Patch Structural League",
          normalizedName:
            "patch structural league"
        });

        await db.insert(auctionSessions).values({
          id: "session-patch-structural",
          leagueId: "league-patch-structural",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "READY"
        });

        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-patch-structural",
          payload: {
            season: "2027/2028"
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "STRUCTURAL_FIELDS_LOCKED"
          })
        });
      }
    );

    it(
      "updates initial credits while the session is READY",
      async () => {
        await db.insert(leagues).values({
          id: "league-patch-ready-credits",
          name: "Patch Ready Credits League",
          normalizedName:
            "patch ready credits league"
        });

        await db.insert(auctionSessions).values({
          id: "session-patch-ready-credits",
          leagueId:
            "league-patch-ready-credits",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "READY"
        });

        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-patch-ready-credits",
          payload: {
            initialCredits: 360
          }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
          data: expect.objectContaining({
            id: "session-patch-ready-credits",
            initialCredits: 360,
            maximumInitialRosterEntries: 11,
            status: "READY"
          }),
          error: null
        });
      }
    );

    it(
      "updates maximum initial roster entries while the session is READY",
      async () => {
        await db.insert(leagues).values({
          id: "league-patch-ready-roster-limit",
          name: "Patch Ready Roster Limit League",
          normalizedName:
            "patch ready roster limit league"
        });

        await db.insert(auctionSessions).values({
          id: "session-patch-ready-roster-limit",
          leagueId:
            "league-patch-ready-roster-limit",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "READY"
        });

        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-patch-ready-roster-limit",
          payload: {
            maximumInitialRosterEntries: 9
          }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
          data: expect.objectContaining({
            id:
              "session-patch-ready-roster-limit",
            maximumInitialRosterEntries: 9,
            status: "READY"
          }),
          error: null
        });
      }
    );

    it(
      "rejects maximum initial roster entries changes while the session is RUNNING",
      async () => {
        await db.insert(leagues).values({
          id: "league-patch-running-roster-limit",
          name: "Patch Running Roster Limit League",
          normalizedName:
            "patch running roster limit league"
        });

        await db.insert(auctionSessions).values({
          id:
            "session-patch-running-roster-limit",
          leagueId:
            "league-patch-running-roster-limit",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "RUNNING"
        });

        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-patch-running-roster-limit",
          payload: {
            maximumInitialRosterEntries: 9
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "STRUCTURAL_FIELDS_LOCKED"
          })
        });
      }
    );

    it(
      "updates initial credits while the session is RUNNING",
      async () => {
        await db.insert(leagues).values({
          id: "league-patch-running",
          name: "Patch Running League",
          normalizedName:
            "patch running league"
        });

        await db.insert(auctionSessions).values({
          id: "session-patch-running",
          leagueId: "league-patch-running",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "RUNNING"
        });

        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-patch-running",
          payload: {
            initialCredits: 360
          }
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
          data: expect.objectContaining({
            id: "session-patch-running",
            initialCredits: 360,
            maximumInitialRosterEntries: 11,
            status: "RUNNING"
          }),
          error: null
        });
      }
    );

    it(
      "returns 409 when the auction session is read-only",
      async () => {
        await db.insert(leagues).values({
          id: "league-patch-completed",
          name: "Patch Completed League",
          normalizedName:
            "patch completed league"
        });

        await db.insert(auctionSessions).values({
          id: "session-patch-completed",
          leagueId: "league-patch-completed",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "COMPLETED"
        });

        const response = await app.inject({
          method: "PATCH",
          url:
            "/api/auction-sessions/session-patch-completed",
          payload: {
            initialCredits: 360
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "SESSION_READ_ONLY"
          })
        });
      }
    );
  });
  describe("DELETE /api/auction-sessions/:id", () => {
    it(
      "deletes an auction session in SETUP",
      async () => {
        await db.insert(leagues).values({
          id: "league-delete-setup",
          name: "Delete Setup League",
          normalizedName: "delete setup league"
        });

        await db.insert(auctionSessions).values({
          id: "session-delete-setup",
          leagueId: "league-delete-setup",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "SETUP"
        });

        const response = await app.inject({
          method: "DELETE",
          url:
            "/api/auction-sessions/session-delete-setup"
        });

        expect(response.statusCode).toBe(204);
        expect(response.body).toBe("");

        const getResponse = await app.inject({
          method: "GET",
          url:
            "/api/auction-sessions/session-delete-setup"
        });

        expect(getResponse.statusCode).toBe(404);
      }
    );

    it(
      "returns 404 when the auction session does not exist",
      async () => {
        const response = await app.inject({
          method: "DELETE",
          url:
            "/api/auction-sessions/missing-delete-session"
        });

        expect(response.statusCode).toBe(404);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "AUCTION_SESSION_NOT_FOUND"
          })
        });
      }
    );

    it(
      "returns 409 when deleting an auction session outside SETUP",
      async () => {
        await db.insert(leagues).values({
          id: "league-delete-ready",
          name: "Delete Ready League",
          normalizedName: "delete ready league"
        });

        await db.insert(auctionSessions).values({
          id: "session-delete-ready",
          leagueId: "league-delete-ready",
          season: "2026/2027",
          editionNumber: 35,
          initialCredits: 330,
          maximumInitialRosterEntries: 11,
          status: "READY"
        });

        const response = await app.inject({
          method: "DELETE",
          url:
            "/api/auction-sessions/session-delete-ready"
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: expect.objectContaining({
            code: "SESSION_DELETE_NOT_ALLOWED"
          })
        });

        const getResponse = await app.inject({
          method: "GET",
          url:
            "/api/auction-sessions/session-delete-ready"
        });

        expect(getResponse.statusCode).toBe(200);
      }
    );
  });
  describe(
    "POST /api/auction-sessions/:id/commands/:command",
    () => {
      it(
        "executes the complete auction session lifecycle",
        async () => {
          await db.insert(leagues).values({
            id: "league-command-lifecycle",
            name: "Command Lifecycle League",
            normalizedName:
              "command lifecycle league"
          });

          await db.insert(auctionSessions).values({
            id: "session-command-lifecycle",
            leagueId: "league-command-lifecycle",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "SETUP"
          });

          const executeCommand = async (
            command: string,
            payload?: Record<string, unknown>
          ) =>
            app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                "session-command-lifecycle/" +
                `commands/${command}`,
              ...(payload
                ? { payload }
                : {})
            });

          const readyResponse =
            await executeCommand("ready");

          expect(readyResponse.statusCode).toBe(200);
          expect(readyResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "READY"
            }),
            error: null
          });

          const startResponse =
            await executeCommand("start");

          expect(startResponse.statusCode).toBe(200);
          expect(startResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "RUNNING"
            }),
            error: null
          });

          const suspendResponse =
            await executeCommand(
              "suspend",
              {
                commandId:
                  "session-lifecycle-suspend",
                stateVersion: 0,
                reason: "PIZZA_BREAK"
              }
            );

          expect(suspendResponse.statusCode).toBe(200);
          expect(suspendResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "SUSPENDED",
              suspensionReason:
                "PIZZA_BREAK"
            }),
            stateVersion: 1,
            idempotentReplay: false,
            error: null
          });

          const resumeResponse =
            await executeCommand(
              "resume",
              {
                commandId:
                  "session-lifecycle-resume",
                stateVersion: 1
              }
            );

          expect(resumeResponse.statusCode).toBe(200);
          expect(resumeResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "RUNNING",
              suspensionReason: null
            }),
            stateVersion: 2,
            idempotentReplay: false,
            error: null
          });

          const completeResponse =
            await executeCommand("complete");

          expect(completeResponse.statusCode).toBe(200);
          expect(completeResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "COMPLETED"
            }),
            error: null
          });

          const closeResponse =
            await executeCommand("close");

          expect(closeResponse.statusCode).toBe(200);
          expect(closeResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "CLOSED"
            }),
            error: null
          });
        }
      );

      it(
        "returns 400 for an invalid suspend payload",
        async () => {
          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-invalid-suspend-payload/" +
              "commands/suspend",
            payload: {
              commandId:
                "invalid-suspend-command",
              stateVersion: 0
            }
          });

          expect(response.statusCode).toBe(400);

          expect(response.json()).toEqual({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"commandId", "stateVersion" and "reason" are required and must be valid'
            }
          });
        }
      );

      it(
        "returns 400 for an invalid resume payload",
        async () => {
          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-invalid-resume-payload/" +
              "commands/resume",
            payload: {
              commandId:
                "invalid-resume-command"
            }
          });

          expect(response.statusCode).toBe(400);

          expect(response.json()).toEqual({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"commandId" and "stateVersion" are required and must be valid'
            }
          });
        }
      );

      it(
        "returns an idempotent replay for an identical suspend command",
        async () => {
          await db.insert(leagues).values({
            id: "league-command-suspend-replay",
            name: "Suspend Replay League",
            normalizedName:
              "suspend replay league"
          });

          await db.insert(auctionSessions).values({
            id: "session-command-suspend-replay",
            leagueId:
              "league-command-suspend-replay",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "RUNNING",
            stateVersion: 0
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              "session-command-suspend-replay/" +
              "commands/suspend",
            payload: {
              commandId:
                "suspend-replay-command",
              stateVersion: 0,
              reason: "PIZZA_BREAK"
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(firstResponse.statusCode).toBe(200);

          const retryResponse =
            await app.inject(request);

          expect(retryResponse.statusCode).toBe(200);

          expect(retryResponse.json()).toEqual({
            data: expect.objectContaining({
              id:
                "session-command-suspend-replay",
              status: "SUSPENDED",
              suspensionReason:
                "PIZZA_BREAK"
            }),
            stateVersion: 1,
            idempotentReplay: true,
            error: null
          });
        }
      );

      it(
        "returns 409 for a stale suspend state version",
        async () => {
          await db.insert(leagues).values({
            id: "league-command-suspend-stale",
            name: "Suspend Stale League",
            normalizedName:
              "suspend stale league"
          });

          await db.insert(auctionSessions).values({
            id: "session-command-suspend-stale",
            leagueId:
              "league-command-suspend-stale",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "RUNNING",
            stateVersion: 3
          });

          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-command-suspend-stale/" +
              "commands/suspend",
            payload: {
              commandId:
                "suspend-stale-command",
              stateVersion: 2,
              reason: "TECHNICAL_BREAK"
            }
          });

          expect(response.statusCode).toBe(409);

          expect(response.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code: "STALE_STATE"
            })
          });
        }
      );

      it(
        "returns 409 when a suspend commandId is reused with different data",
        async () => {
          await db.insert(leagues).values({
            id: "league-command-suspend-conflict",
            name: "Suspend Conflict League",
            normalizedName:
              "suspend conflict league"
          });

          await db.insert(auctionSessions).values({
            id: "session-command-suspend-conflict",
            leagueId:
              "league-command-suspend-conflict",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "RUNNING",
            stateVersion: 0
          });

          const url =
            "/api/auction-sessions/" +
            "session-command-suspend-conflict/" +
            "commands/suspend";

          const firstResponse =
            await app.inject({
              method: "POST",
              url,
              payload: {
                commandId:
                  "suspend-conflict-command",
                stateVersion: 0,
                reason: "PIZZA_BREAK"
              }
            });

          expect(firstResponse.statusCode).toBe(200);

          const conflictingResponse =
            await app.inject({
              method: "POST",
              url,
              payload: {
                commandId:
                  "suspend-conflict-command",
                stateVersion: 0,
                reason: "NETWORK_ISSUE"
              }
            });

          expect(
            conflictingResponse.statusCode
          ).toBe(409);

          expect(
            conflictingResponse.json()
          ).toEqual({
            data: null,
            error: expect.objectContaining({
              code: "COMMAND_ID_CONFLICT"
            })
          });
        }
      );

      it(
        "reopens a closed session and replays the command idempotently",
        async () => {
          const leagueId =
            "league-command-reopen";
          const sessionId =
            "session-command-reopen";

          await db.insert(leagues).values({
            id: leagueId,
            name: "Reopen Command League",
            normalizedName:
              "reopen command league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "CLOSED",
            stateVersion: 6
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/reopen",
            payload: {
              commandId:
                "reopen-http-command",
              stateVersion: 6
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(firstResponse.statusCode)
            .toBe(200);

          expect(firstResponse.json()).toEqual({
            data: expect.objectContaining({
              id: sessionId,
              status: "COMPLETED",
              suspensionReason: null
            }),
            stateVersion: 7,
            idempotentReplay: false,
            error: null
          });

          const retryResponse =
            await app.inject(request);

          expect(retryResponse.statusCode)
            .toBe(200);

          expect(retryResponse.json()).toEqual({
            data: expect.objectContaining({
              id: sessionId,
              status: "COMPLETED",
              suspensionReason: null
            }),
            stateVersion: 7,
            idempotentReplay: true,
            error: null
          });

          const matchingEvents =
            (
              await db
                .select()
                .from(auctionEvents)
            ).filter(
              (event) =>
                event.auctionSessionId ===
                  sessionId &&
                event.eventType ===
                  "SESSION_REOPENED"
            );

          expect(matchingEvents)
            .toHaveLength(1);

          const matchingCommands =
            (
              await db
                .select()
                .from(commandRegistry)
            ).filter(
              (command) =>
                command.auctionSessionId ===
                  sessionId &&
                command.commandId ===
                  "reopen-http-command"
            );

          expect(matchingCommands)
            .toHaveLength(1);

          expect(matchingCommands[0]).toEqual(
            expect.objectContaining({
              commandScope:
                "AUCTION_SESSION",
              commandType:
                "REOPEN_SESSION",
              expectedStateVersion: 6,
              resultStateVersion: 7
            })
          );
        }
      );

      it(
        "returns 400 for an invalid reopen payload",
        async () => {
          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-invalid-reopen-payload/" +
              "commands/reopen",
            payload: {
              commandId:
                "invalid-reopen-command"
            }
          });

          expect(response.statusCode)
            .toBe(400);

          expect(response.json()).toEqual({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"commandId" and "stateVersion" are required and must be valid'
            }
          });
        }
      );

      it(
        "returns 409 when reopening a session that is not closed",
        async () => {
          const leagueId =
            "league-command-reopen-invalid";
          const sessionId =
            "session-command-reopen-invalid";

          await db.insert(leagues).values({
            id: leagueId,
            name:
              "Invalid Reopen Command League",
            normalizedName:
              "invalid reopen command league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "COMPLETED",
            stateVersion: 3
          });

          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/reopen",
            payload: {
              commandId:
                "invalid-reopen-status-command",
              stateVersion: 3
            }
          });

          expect(response.statusCode)
            .toBe(409);

          expect(response.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code:
                "INVALID_STATUS_TRANSITION"
            })
          });
        }
      );

      it(
        "returns 400 for an unknown command",
        async () => {
          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-command-invalid/" +
              "commands/unknown-command"
          });

          expect(response.statusCode).toBe(400);

          expect(response.json()).toEqual({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                'Unknown auction session command "unknown-command"'
            }
          });
        }
      );

      it(
        "returns 404 when the auction session does not exist",
        async () => {
          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "missing-command-session/" +
              "commands/ready"
          });

          expect(response.statusCode).toBe(404);

          expect(response.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code: "AUCTION_SESSION_NOT_FOUND"
            })
          });
        }
      );

      it(
        "returns 409 for an invalid status transition",
        async () => {
          await db.insert(leagues).values({
            id: "league-command-invalid-transition",
            name: "Invalid Transition League",
            normalizedName:
              "invalid transition league"
          });

          await db.insert(auctionSessions).values({
            id:
              "session-command-invalid-transition",
            leagueId:
              "league-command-invalid-transition",
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "SETUP"
          });

          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-command-invalid-transition/" +
              "commands/start"
          });

          expect(response.statusCode).toBe(409);

          expect(response.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code: "INVALID_STATUS_TRANSITION"
            })
          });
        }
      );

      it(
        "returns 409 when another session is already active for the league",
        async () => {
          await db.insert(leagues).values({
            id: "league-command-active-conflict",
            name: "Active Conflict League",
            normalizedName:
              "active conflict league"
          });

          await db.insert(auctionSessions).values([
            {
              id: "session-command-active",
              leagueId:
                "league-command-active-conflict",
              season: "2025/2026",
              editionNumber: 34,
              initialCredits: 330,
              maximumInitialRosterEntries: 11,
              status: "READY"
            },
            {
              id: "session-command-conflicting",
              leagueId:
                "league-command-active-conflict",
              season: "2026/2027",
              editionNumber: 35,
              initialCredits: 330,
              maximumInitialRosterEntries: 11,
              status: "SETUP"
            }
          ]);

          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-command-conflicting/" +
              "commands/ready"
          });

          expect(response.statusCode).toBe(409);

          expect(response.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code:
                "ACTIVE_SESSION_ALREADY_EXISTS"
            })
          });
        }
      );
    }
  );

  describe(
    "POST /api/auction-sessions/:id/commands/add-manual-initial-roster-entry",
    () => {
      it(
        "adds an initial roster entry atomically and replays the same command idempotently",
        async () => {
          const leagueId =
            "league-manual-roster-http";
          const sessionId =
            "session-manual-roster-http";
          const teamId =
            "team-manual-roster-http";
          const sessionTeamId =
            "session-team-manual-roster-http";
          const playerId =
            "player-manual-roster-http";

          await db.insert(leagues).values({
            id: leagueId,
            name: "Manual Roster HTTP League",
            normalizedName:
              "manual roster http league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "READY",
            stateVersion: 0
          });

          await db.insert(teams).values({
            id: teamId,
            leagueId,
            name: "Manual Roster HTTP Team"
          });

          await db
            .insert(auctionSessionTeams)
            .values({
              id: sessionTeamId,
              auctionSessionId: sessionId,
              teamId,
              tableOrder: 1,
              remainingCredits: 330,
              renewalCredits: 0
            });

          await db.insert(players).values({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode: "manual-http-001",
            name: "Manual HTTP Player",
            normalizedName:
              "manual http player",
            role: "P",
            availabilityStatus: "AVAILABLE"
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/add-manual-initial-roster-entry",
            payload: {
              commandId:
                "manual-roster-http-command",
              stateVersion: 0,
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              acquisitionCost: 10,
              contractYear: 1,
              actor: {
                name: "Integration Tester",
                role: "ADMINISTRATOR"
              },
              comment:
                "HTTP integration test"
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(firstResponse.statusCode).toBe(200);

          expect(firstResponse.json()).toEqual({
            data: expect.objectContaining({
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              acquisitionCost: 10,
              contractYear: 1,
              source: "INITIAL_ROSTER"
            }),
            stateVersion: 1,
            idempotentReplay: false,
            error: null
          });

          const retryResponse =
            await app.inject(request);

          expect(retryResponse.statusCode).toBe(200);

          expect(retryResponse.json()).toEqual({
            data: expect.objectContaining({
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              acquisitionCost: 10,
              contractYear: 1,
              source: "INITIAL_ROSTER"
            }),
            stateVersion: 1,
            idempotentReplay: true,
            error: null
          });

          const storedRosterEntries =
            await db
              .select()
              .from(rosterEntries);

          const matchingRosterEntries =
            storedRosterEntries.filter(
              (entry) =>
                entry.auctionSessionTeamId ===
                  sessionTeamId &&
                entry.playerId === playerId
            );

          expect(
            matchingRosterEntries
          ).toHaveLength(1);

          const storedEvents =
            await db
              .select()
              .from(auctionEvents);

          const matchingEvents =
            storedEvents.filter(
              (event) =>
                event.auctionSessionId ===
                  sessionId &&
                event.eventType ===
                  "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY"
            );

          expect(matchingEvents).toHaveLength(1);

          expect(matchingEvents[0]).toEqual(
            expect.objectContaining({
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              amount: 10,
              creditsBefore: 330,
              creditsAfter: 320,
              contractYear: 1,
              actorName:
                "Integration Tester",
              actorRole:
                "ADMINISTRATOR",
              comment:
                "HTTP integration test"
            })
          );

          const storedCommands =
            await db
              .select()
              .from(commandRegistry);

          const matchingCommands =
            storedCommands.filter(
              (command) =>
                command.auctionSessionId ===
                  sessionId &&
                command.commandId ===
                  "manual-roster-http-command"
            );

          expect(matchingCommands).toHaveLength(1);

          const [updatedSession] =
            await db
              .select()
              .from(auctionSessions)
              .where(
                eq(
                  auctionSessions.id,
                  sessionId
                )
              );

          expect(
            updatedSession?.stateVersion
          ).toBe(1);

          const [updatedSessionTeam] =
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
            updatedSessionTeam?.remainingCredits
          ).toBe(320);
        }
      );

      it(
        "rejects an invalid manual initial roster command payload",
        async () => {
          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-manual-roster-invalid-payload" +
              "/commands/add-manual-initial-roster-entry",
            payload: {
              commandId:
                "manual-roster-invalid-command",
              stateVersion: 0,
              auctionSessionTeamId:
                "session-team-invalid",
              playerId:
                "player-invalid",
              acquisitionCost: 0,
              contractYear: 1,
              actor: {
                name: "Integration Tester",
                role: "ADMINISTRATOR"
              }
            }
          });

          expect(response.statusCode).toBe(400);

          expect(response.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code: "INVALID_REQUEST"
            })
          });
        }
      );

      it(
        "rejects a stale manual initial roster command",
        async () => {
          const leagueId =
            "league-manual-roster-stale";
          const sessionId =
            "session-manual-roster-stale";
          const teamId =
            "team-manual-roster-stale";
          const sessionTeamId =
            "session-team-manual-roster-stale";
          const playerId =
            "player-manual-roster-stale";

          await db.insert(leagues).values({
            id: leagueId,
            name: "Manual Roster Stale League",
            normalizedName:
              "manual roster stale league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 36,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "READY",
            stateVersion: 1
          });

          await db.insert(teams).values({
            id: teamId,
            leagueId,
            name: "Manual Roster Stale Team"
          });

          await db
            .insert(auctionSessionTeams)
            .values({
              id: sessionTeamId,
              auctionSessionId: sessionId,
              teamId,
              tableOrder: 1,
              remainingCredits: 330,
              renewalCredits: 0
            });

          await db.insert(players).values({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode: "manual-stale-001",
            name: "Manual Stale Player",
            normalizedName:
              "manual stale player",
            role: "P",
            availabilityStatus: "AVAILABLE"
          });

          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/add-manual-initial-roster-entry",
            payload: {
              commandId:
                "manual-roster-stale-command",
              stateVersion: 0,
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              acquisitionCost: 10,
              contractYear: 1,
              actor: {
                name: "Integration Tester",
                role: "ADMINISTRATOR"
              }
            }
          });

          expect(response.statusCode).toBe(409);

          expect(response.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code: "STALE_STATE"
            })
          });
        }
      );

      it(
        "rejects reuse of a manual roster command id with different data",
        async () => {
          const leagueId =
            "league-manual-roster-conflict";
          const sessionId =
            "session-manual-roster-conflict";
          const teamId =
            "team-manual-roster-conflict";
          const sessionTeamId =
            "session-team-manual-roster-conflict";
          const playerId =
            "player-manual-roster-conflict";

          await db.insert(leagues).values({
            id: leagueId,
            name: "Manual Roster Conflict League",
            normalizedName:
              "manual roster conflict league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 37,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "READY",
            stateVersion: 0
          });

          await db.insert(teams).values({
            id: teamId,
            leagueId,
            name: "Manual Roster Conflict Team"
          });

          await db
            .insert(auctionSessionTeams)
            .values({
              id: sessionTeamId,
              auctionSessionId: sessionId,
              teamId,
              tableOrder: 1,
              remainingCredits: 330,
              renewalCredits: 0
            });

          await db.insert(players).values({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode: "manual-conflict-001",
            name: "Manual Conflict Player",
            normalizedName:
              "manual conflict player",
            role: "P",
            availabilityStatus: "AVAILABLE"
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/add-manual-initial-roster-entry",
            payload: {
              commandId:
                "manual-roster-conflict-command",
              stateVersion: 0,
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              acquisitionCost: 10,
              contractYear: 1,
              actor: {
                name: "Integration Tester",
                role: "ADMINISTRATOR"
              }
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(firstResponse.statusCode).toBe(200);

          const conflictResponse =
            await app.inject({
              ...request,
              payload: {
                ...request.payload,
                acquisitionCost: 11
              }
            });

          expect(conflictResponse.statusCode).toBe(409);

          expect(conflictResponse.json()).toEqual({
            data: null,
            error: expect.objectContaining({
              code: "COMMAND_ID_CONFLICT"
            })
          });
        }
      );
    }
  );

  describe(
    "POST /api/auction-sessions/:id/commands/add-manual-roster-assignment",
    () => {
      it(
        "adds a manual roster assignment atomically and replays the same command idempotently",
        async () => {
          const leagueId =
            "league-manual-assignment-http";
          const sessionId =
            "session-manual-assignment-http";
          const teamId =
            "team-manual-assignment-http";
          const sessionTeamId =
            "session-team-manual-assignment-http";
          const playerId =
            "player-manual-assignment-http";

          await db.insert(leagues).values({
            id: leagueId,
            name:
              "Manual Assignment HTTP League",
            normalizedName:
              "manual assignment http league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 38,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "READY",
            stateVersion: 0
          });

          await db.insert(teams).values({
            id: teamId,
            leagueId,
            name:
              "Manual Assignment HTTP Team"
          });

          await db
            .insert(auctionSessionTeams)
            .values({
              id: sessionTeamId,
              auctionSessionId: sessionId,
              teamId,
              tableOrder: 1,
              remainingCredits: 330,
              renewalCredits: 0
            });

          await db.insert(players).values({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode:
              "manual-assignment-http-001",
            name:
              "Manual Assignment HTTP Player",
            normalizedName:
              "manual assignment http player",
            role: "A",
            availabilityStatus:
              "AVAILABLE"
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/add-manual-roster-assignment",
            payload: {
              commandId:
                "manual-assignment-http-command",
              stateVersion: 0,
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              acquisitionCost: 30,
              contractYear: 3,
              manualAssignmentReason:
                "OPTION_EXERCISED_MANUALLY",
              actor: {
                name:
                  "Integration Tester",
                role:
                  "AUCTIONEER"
              },
              comment:
                "Opzione esercitata manualmente"
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(
            firstResponse.statusCode
          ).toBe(200);

          expect(
            firstResponse.json()
          ).toEqual({
            data:
              expect.objectContaining({
                auctionSessionTeamId:
                  sessionTeamId,
                playerId,
                acquisitionCost: 30,
                contractYear: 3,
                source:
                  "MANUAL_ASSIGNMENT"
              }),
            stateVersion: 1,
            idempotentReplay: false,
            error: null
          });

          const retryResponse =
            await app.inject(request);

          expect(
            retryResponse.statusCode
          ).toBe(200);

          expect(
            retryResponse.json()
          ).toEqual({
            data:
              expect.objectContaining({
                auctionSessionTeamId:
                  sessionTeamId,
                playerId,
                acquisitionCost: 30,
                contractYear: 3,
                source:
                  "MANUAL_ASSIGNMENT"
              }),
            stateVersion: 1,
            idempotentReplay: true,
            error: null
          });

          const matchingRosterEntries =
            (
              await db
                .select()
                .from(rosterEntries)
            ).filter(
              (entry) =>
                entry.auctionSessionTeamId ===
                  sessionTeamId &&
                entry.playerId ===
                  playerId
            );

          expect(
            matchingRosterEntries
          ).toHaveLength(1);

          const matchingEvents =
            (
              await db
                .select()
                .from(auctionEvents)
            ).filter(
              (event) =>
                event.auctionSessionId ===
                  sessionId &&
                event.eventType ===
                  "MANUAL_ROSTER_ASSIGNMENT_ADDED"
            );

          expect(
            matchingEvents
          ).toHaveLength(1);

          expect(
            matchingEvents[0]
          ).toEqual(
            expect.objectContaining({
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              amount: 30,
              creditsBefore: 330,
              creditsAfter: 300,
              contractYear: 3,
              actorName:
                "Integration Tester",
              actorRole:
                "AUCTIONEER",
              manualAssignmentReason:
                "OPTION_EXERCISED_MANUALLY",
              comment:
                "Opzione esercitata manualmente"
            })
          );

          const matchingCommands =
            (
              await db
                .select()
                .from(commandRegistry)
            ).filter(
              (command) =>
                command.auctionSessionId ===
                  sessionId &&
                command.commandId ===
                  "manual-assignment-http-command"
            );

          expect(
            matchingCommands
          ).toHaveLength(1);

          expect(
            matchingCommands[0]
          ).toEqual(
            expect.objectContaining({
              commandScope:
                "AUCTION_SESSION",
              commandType:
                "ADD_MANUAL_ROSTER_ASSIGNMENT",
              expectedStateVersion: 0,
              resultStateVersion: 1
            })
          );

          const [updatedSession] =
            await db
              .select()
              .from(auctionSessions)
              .where(
                eq(
                  auctionSessions.id,
                  sessionId
                )
              );

          expect(
            updatedSession?.stateVersion
          ).toBe(1);

          const [updatedSessionTeam] =
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
            updatedSessionTeam
              ?.remainingCredits
          ).toBe(300);

          const [updatedPlayer] =
            await db
              .select()
              .from(players)
              .where(
                eq(
                  players.id,
                  playerId
                )
              );

          expect(
            updatedPlayer
              ?.availabilityStatus
          ).toBe("ROSTERED");
        }
      );

      it(
        "rejects a manual roster assignment without the mandatory comment",
        async () => {
          const response =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                "session-manual-assignment-invalid" +
                "/commands/add-manual-roster-assignment",
              payload: {
                commandId:
                  "manual-assignment-invalid-command",
                stateVersion: 0,
                auctionSessionTeamId:
                  "session-team-invalid",
                playerId:
                  "player-invalid",
                acquisitionCost: 10,
                contractYear: 1,
                manualAssignmentReason:
                  "OTHER",
                actor: {
                  name:
                    "Integration Tester",
                  role:
                    "ADMINISTRATOR"
                }
              }
            });

          expect(
            response.statusCode
          ).toBe(400);

          expect(
            response.json()
          ).toEqual({
            data: null,
            error:
              expect.objectContaining({
                code:
                  "INVALID_REQUEST"
              })
          });
        }
      );

      it(
        "rejects a stale manual roster assignment command",
        async () => {
          const leagueId =
            "league-manual-assignment-stale";
          const sessionId =
            "session-manual-assignment-stale";
          const teamId =
            "team-manual-assignment-stale";
          const sessionTeamId =
            "session-team-manual-assignment-stale";
          const playerId =
            "player-manual-assignment-stale";

          await db.insert(leagues).values({
            id: leagueId,
            name:
              "Manual Assignment Stale League",
            normalizedName:
              "manual assignment stale league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 39,
            initialCredits: 330,
            status: "READY",
            stateVersion: 1
          });

          await db.insert(teams).values({
            id: teamId,
            leagueId,
            name:
              "Manual Assignment Stale Team"
          });

          await db
            .insert(auctionSessionTeams)
            .values({
              id: sessionTeamId,
              auctionSessionId: sessionId,
              teamId,
              tableOrder: 1,
              remainingCredits: 330,
              renewalCredits: 0
            });

          await db.insert(players).values({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode:
              "manual-assignment-stale-001",
            name:
              "Manual Assignment Stale Player",
            normalizedName:
              "manual assignment stale player",
            role: "D",
            availabilityStatus:
              "AVAILABLE"
          });

          const response =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                sessionId +
                "/commands/add-manual-roster-assignment",
              payload: {
                commandId:
                  "manual-assignment-stale-command",
                stateVersion: 0,
                auctionSessionTeamId:
                  sessionTeamId,
                playerId,
                acquisitionCost: 10,
                contractYear: 1,
                manualAssignmentReason:
                  "OTHER",
                actor: {
                  name:
                    "Integration Tester",
                  role:
                    "ADMINISTRATOR"
                },
                comment:
                  "Test stale state"
              }
            });

          expect(
            response.statusCode
          ).toBe(409);

          expect(
            response.json()
          ).toEqual({
            data: null,
            error:
              expect.objectContaining({
                code:
                  "STALE_STATE"
              })
          });
        }
      );

      it(
        "rejects reuse of a manual assignment command id when the reason changes",
        async () => {
          const leagueId =
            "league-manual-assignment-conflict";
          const sessionId =
            "session-manual-assignment-conflict";
          const teamId =
            "team-manual-assignment-conflict";
          const sessionTeamId =
            "session-team-manual-assignment-conflict";
          const playerId =
            "player-manual-assignment-conflict";

          await db.insert(leagues).values({
            id: leagueId,
            name:
              "Manual Assignment Conflict League",
            normalizedName:
              "manual assignment conflict league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 40,
            initialCredits: 330,
            status: "READY",
            stateVersion: 0
          });

          await db.insert(teams).values({
            id: teamId,
            leagueId,
            name:
              "Manual Assignment Conflict Team"
          });

          await db
            .insert(auctionSessionTeams)
            .values({
              id: sessionTeamId,
              auctionSessionId: sessionId,
              teamId,
              tableOrder: 1,
              remainingCredits: 330,
              renewalCredits: 0
            });

          await db.insert(players).values({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode:
              "manual-assignment-conflict-001",
            name:
              "Manual Assignment Conflict Player",
            normalizedName:
              "manual assignment conflict player",
            role: "C",
            availabilityStatus:
              "AVAILABLE"
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/add-manual-roster-assignment",
            payload: {
              commandId:
                "manual-assignment-conflict-command",
              stateVersion: 0,
              auctionSessionTeamId:
                sessionTeamId,
              playerId,
              acquisitionCost: 10,
              contractYear: 1,
              manualAssignmentReason:
                "OPTION_NO_EXTERNAL_BID",
              actor: {
                name:
                  "Integration Tester",
                role:
                  "AUCTIONEER"
              },
              comment:
                "Motivazione invariata"
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(
            firstResponse.statusCode
          ).toBe(200);

          const conflictResponse =
            await app.inject({
              ...request,
              payload: {
                ...request.payload,
                manualAssignmentReason:
                  "OTHER"
              }
            });

          expect(
            conflictResponse.statusCode
          ).toBe(409);

          expect(
            conflictResponse.json()
          ).toEqual({
            data: null,
            error:
              expect.objectContaining({
                code:
                  "COMMAND_ID_CONFLICT"
              })
          });
        }
      );
    }
  );

  describe(
    "POST /api/auction-sessions/:id/commands/technical-roster-correction",
    () => {
      it(
        "corrects a roster entry atomically and replays the same command idempotently",
        async () => {
          const leagueId =
            "league-technical-correction-http";
          const sessionId =
            "session-technical-correction-http";

          const sourceTeamId =
            "team-technical-correction-source-http";
          const targetTeamId =
            "team-technical-correction-target-http";

          const sourceSessionTeamId =
            "session-team-technical-correction-source-http";
          const targetSessionTeamId =
            "session-team-technical-correction-target-http";

          const sourcePlayerId =
            "player-technical-correction-source-http";
          const targetPlayerId =
            "player-technical-correction-target-http";

          const rosterEntryId =
            "roster-entry-technical-correction-http";

          await db.insert(leagues).values({
            id: leagueId,
            name:
              "Technical Correction HTTP League",
            normalizedName:
              "technical correction http league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 41,
            initialCredits: 330,
            status: "SUSPENDED",
            suspensionReason:
              "TECHNICAL_BREAK",
            stateVersion: 0
          });

          await db.insert(teams).values([
            {
              id: sourceTeamId,
              leagueId,
              name:
                "Technical Correction Source HTTP Team"
            },
            {
              id: targetTeamId,
              leagueId,
              name:
                "Technical Correction Target HTTP Team"
            }
          ]);

          await db.insert(auctionSessionTeams).values([
            {
              id: sourceSessionTeamId,
              auctionSessionId:
                sessionId,
              teamId:
                sourceTeamId,
              tableOrder: 1,
              remainingCredits: 80,
              renewalCredits: 0
            },
            {
              id: targetSessionTeamId,
              auctionSessionId:
                sessionId,
              teamId:
                targetTeamId,
              tableOrder: 2,
              remainingCredits: 100,
              renewalCredits: 0
            }
          ]);

          await db.insert(players).values([
            {
              id: sourcePlayerId,
              auctionSessionId:
                sessionId,
              fmsCode:
                "technical-correction-http-001",
              name:
                "Technical Correction Source HTTP Player",
              normalizedName:
                "technical correction source http player",
              role: "C",
              availabilityStatus:
                "ROSTERED"
            },
            {
              id: targetPlayerId,
              auctionSessionId:
                sessionId,
              fmsCode:
                "technical-correction-http-002",
              name:
                "Technical Correction Target HTTP Player",
              normalizedName:
                "technical correction target http player",
              role: "A",
              availabilityStatus:
                "AVAILABLE"
            }
          ]);

          await db.insert(rosterEntries).values({
            id: rosterEntryId,
            auctionSessionTeamId:
              sourceSessionTeamId,
            playerId:
              sourcePlayerId,
            acquisitionCost: 20,
            contractYear: 1,
            source: "AUCTION"
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/technical-roster-correction",
            payload: {
              commandId:
                "technical-correction-http-command",
              stateVersion: 0,
              rosterEntryId,
              targetAuctionSessionTeamId:
                targetSessionTeamId,
              targetPlayerId,
              targetAcquisitionCost: 35,
              targetContractYear: 3,
              actor: {
                name:
                  "Integration Tester",
                role:
                  "AUCTIONEER"
              },
              comment:
                "Correzione tecnica completa"
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(
            firstResponse.statusCode
          ).toBe(200);

          expect(
            firstResponse.json()
          ).toEqual({
            data: {
              before: {
                rosterEntry:
                  expect.objectContaining({
                    id:
                      rosterEntryId,
                    auctionSessionTeamId:
                      sourceSessionTeamId,
                    playerId:
                      sourcePlayerId,
                    acquisitionCost: 20,
                    contractYear: 1,
                    source:
                      "AUCTION"
                  }),
                auctionSessionTeamId:
                  sourceSessionTeamId,
                playerId:
                  sourcePlayerId,
                acquisitionCost: 20,
                contractYear: 1
              },
              after: {
                rosterEntry:
                  expect.objectContaining({
                    id:
                      rosterEntryId,
                    auctionSessionTeamId:
                      targetSessionTeamId,
                    playerId:
                      targetPlayerId,
                    acquisitionCost: 35,
                    contractYear: 3,
                    source:
                      "TECHNICAL_CORRECTION"
                  }),
                auctionSessionTeamId:
                  targetSessionTeamId,
                playerId:
                  targetPlayerId,
                acquisitionCost: 35,
                contractYear: 3
              }
            },
            stateVersion: 1,
            idempotentReplay: false,
            error: null
          });

          const retryResponse =
            await app.inject(request);

          expect(
            retryResponse.statusCode
          ).toBe(200);

          expect(
            retryResponse.json()
          ).toEqual({
            data:
              firstResponse.json().data,
            stateVersion: 1,
            idempotentReplay: true,
            error: null
          });

          const [storedEntry] =
            await db
              .select()
              .from(rosterEntries)
              .where(
                eq(
                  rosterEntries.id,
                  rosterEntryId
                )
              );

          expect(storedEntry).toEqual(
            expect.objectContaining({
              auctionSessionTeamId:
                targetSessionTeamId,
              playerId:
                targetPlayerId,
              acquisitionCost: 35,
              contractYear: 3,
              source:
                "TECHNICAL_CORRECTION"
            })
          );

          const [sourceSessionTeam] =
            await db
              .select()
              .from(auctionSessionTeams)
              .where(
                eq(
                  auctionSessionTeams.id,
                  sourceSessionTeamId
                )
              );

          const [targetSessionTeam] =
            await db
              .select()
              .from(auctionSessionTeams)
              .where(
                eq(
                  auctionSessionTeams.id,
                  targetSessionTeamId
                )
              );

          expect(
            sourceSessionTeam
              ?.remainingCredits
          ).toBe(100);

          expect(
            targetSessionTeam
              ?.remainingCredits
          ).toBe(65);

          const matchingEvents =
            (
              await db
                .select()
                .from(auctionEvents)
            ).filter(
              (event) =>
                event.auctionSessionId ===
                  sessionId &&
                event.eventType ===
                  "TECHNICAL_ROSTER_CORRECTION"
            );

          expect(
            matchingEvents
          ).toHaveLength(1);

          expect(
            matchingEvents[0]
          ).toEqual(
            expect.objectContaining({
              actorName:
                "Integration Tester",
              actorRole:
                "AUCTIONEER",
              comment:
                "Correzione tecnica completa",
              beforeAuctionSessionTeamId:
                sourceSessionTeamId,
              beforePlayerId:
                sourcePlayerId,
              beforeAmount: 20,
              beforeContractYear: 1,
              afterAuctionSessionTeamId:
                targetSessionTeamId,
              afterPlayerId:
                targetPlayerId,
              afterAmount: 35,
              afterContractYear: 3
            })
          );

          const matchingCommands =
            (
              await db
                .select()
                .from(commandRegistry)
            ).filter(
              (command) =>
                command.auctionSessionId ===
                  sessionId &&
                command.commandId ===
                  "technical-correction-http-command"
            );

          expect(
            matchingCommands
          ).toHaveLength(1);

          expect(
            matchingCommands[0]
          ).toEqual(
            expect.objectContaining({
              commandScope:
                "AUCTION_SESSION",
              commandType:
                "TECHNICAL_ROSTER_CORRECTION",
              expectedStateVersion: 0,
              resultStateVersion: 1
            })
          );

          const [updatedSession] =
            await db
              .select()
              .from(auctionSessions)
              .where(
                eq(
                  auctionSessions.id,
                  sessionId
                )
              );

          expect(
            updatedSession?.stateVersion
          ).toBe(1);
        }
      );

      it(
        "rejects a technical roster correction without the mandatory comment",
        async () => {
          const response =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                "session-technical-correction-invalid" +
                "/commands/technical-roster-correction",
              payload: {
                commandId:
                  "technical-correction-invalid-command",
                stateVersion: 0,
                rosterEntryId:
                  "roster-entry-invalid",
                targetAuctionSessionTeamId:
                  "session-team-invalid",
                targetPlayerId:
                  "player-invalid",
                targetAcquisitionCost: 10,
                targetContractYear: 1,
                actor: {
                  name:
                    "Integration Tester",
                  role:
                    "ADMINISTRATOR"
                }
              }
            });

          expect(
            response.statusCode
          ).toBe(400);

          expect(
            response.json()
          ).toEqual({
            data: null,
            error:
              expect.objectContaining({
                code:
                  "INVALID_REQUEST"
              })
          });
        }
      );

      it(
        "rejects a stale technical roster correction command",
        async () => {
          const leagueId =
            "league-technical-correction-stale";
          const sessionId =
            "session-technical-correction-stale";

          await db.insert(leagues).values({
            id: leagueId,
            name:
              "Technical Correction Stale League",
            normalizedName:
              "technical correction stale league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 42,
            initialCredits: 330,
            status: "SUSPENDED",
            suspensionReason:
              "TECHNICAL_BREAK",
            stateVersion: 1
          });

          const response =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                sessionId +
                "/commands/technical-roster-correction",
              payload: {
                commandId:
                  "technical-correction-stale-command",
                stateVersion: 0,
                rosterEntryId:
                  "missing-roster-entry",
                targetAuctionSessionTeamId:
                  "missing-session-team",
                targetPlayerId:
                  "missing-player",
                targetAcquisitionCost: 10,
                targetContractYear: 1,
                actor: {
                  name:
                    "Integration Tester",
                  role:
                    "ADMINISTRATOR"
                },
                comment:
                  "Test stale state"
              }
            });

          expect(
            response.statusCode
          ).toBe(409);

          expect(
            response.json()
          ).toEqual({
            data: null,
            error:
              expect.objectContaining({
                code:
                  "STALE_STATE"
              })
          });
        }
      );

      it(
        "rejects reuse of a technical correction command id when the correction changes",
        async () => {
          const leagueId =
            "league-technical-correction-conflict";
          const sessionId =
            "session-technical-correction-conflict";
          const teamId =
            "team-technical-correction-conflict";
          const sessionTeamId =
            "session-team-technical-correction-conflict";
          const playerId =
            "player-technical-correction-conflict";
          const rosterEntryId =
            "roster-entry-technical-correction-conflict";

          await db.insert(leagues).values({
            id: leagueId,
            name:
              "Technical Correction Conflict League",
            normalizedName:
              "technical correction conflict league"
          });

          await db.insert(auctionSessions).values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 43,
            initialCredits: 330,
            status: "SUSPENDED",
            suspensionReason:
              "TECHNICAL_BREAK",
            stateVersion: 0
          });

          await db.insert(teams).values({
            id: teamId,
            leagueId,
            name:
              "Technical Correction Conflict Team"
          });

          await db
            .insert(auctionSessionTeams)
            .values({
              id: sessionTeamId,
              auctionSessionId:
                sessionId,
              teamId,
              tableOrder: 1,
              remainingCredits: 310,
              renewalCredits: 0
            });

          await db.insert(players).values({
            id: playerId,
            auctionSessionId:
              sessionId,
            fmsCode:
              "technical-correction-conflict-001",
            name:
              "Technical Correction Conflict Player",
            normalizedName:
              "technical correction conflict player",
            role: "D",
            availabilityStatus:
              "ROSTERED"
          });

          await db.insert(rosterEntries).values({
            id: rosterEntryId,
            auctionSessionTeamId:
              sessionTeamId,
            playerId,
            acquisitionCost: 20,
            contractYear: 1,
            source: "AUCTION"
          });

          const request = {
            method: "POST" as const,
            url:
              "/api/auction-sessions/" +
              sessionId +
              "/commands/technical-roster-correction",
            payload: {
              commandId:
                "technical-correction-conflict-command",
              stateVersion: 0,
              rosterEntryId,
              targetAuctionSessionTeamId:
                sessionTeamId,
              targetPlayerId:
                playerId,
              targetAcquisitionCost: 25,
              targetContractYear: 2,
              actor: {
                name:
                  "Integration Tester",
                role:
                  "AUCTIONEER"
              },
              comment:
                "Motivazione invariata"
            }
          };

          const firstResponse =
            await app.inject(request);

          expect(
            firstResponse.statusCode
          ).toBe(200);

          const conflictResponse =
            await app.inject({
              ...request,
              payload: {
                ...request.payload,
                targetAcquisitionCost: 26
              }
            });

          expect(
            conflictResponse.statusCode
          ).toBe(409);

          expect(
            conflictResponse.json()
          ).toEqual({
            data: null,
            error:
              expect.objectContaining({
                code:
                  "COMMAND_ID_CONFLICT"
              })
          });
        }
      );
    }
  );

  describe(
    "POST /api/auction-sessions/:id/reset-development-session",
    () => {
      const leagueId =
        "league-http-development-reset";
      const sessionId =
        "session-http-development-reset";
      const teamId =
        "team-http-development-reset";
      const sessionTeamId =
        "session-team-http-development-reset";
      const playerId =
        "player-http-development-reset";

      async function createFixture(
        status:
          | "COMPLETED"
          | "CLOSED"
      ): Promise<void> {
        await db.insert(leagues).values({
          id: leagueId,
          name: "HTTP Development Reset League",
          normalizedName:
            "http development reset league"
        });

        await db.insert(auctionSessions).values({
          id: sessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 94,
          status,
          initialCredits: 300,
          stateVersion: 7
        });

        await db.insert(teams).values({
          id: teamId,
          leagueId,
          name: "HTTP Development Reset Team"
        });

        await db
          .insert(auctionSessionTeams)
          .values({
            id: sessionTeamId,
            auctionSessionId:
              sessionId,
            teamId,
            tableOrder: 1,
            renewalCredits: 0,
            remainingCredits: 247
          });

        await db.insert(players).values({
          id: playerId,
          auctionSessionId:
            sessionId,
          fmsCode:
            "HTTP-DEV-RESET-001",
          name:
            "HTTP Development Reset Player",
          normalizedName:
            "http development reset player",
          role: "A",
          availabilityStatus:
            "AVAILABLE"
        });
      }

      async function cleanupFixture():
        Promise<void> {
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
          .where(
            eq(
              teams.id,
              teamId
            )
          );

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
          .where(
            eq(
              leagues.id,
              leagueId
            )
          );
      }

      it(
        "resets a completed development session to SETUP",
        async () => {
          await createFixture(
            "COMPLETED"
          );

          try {
            const response =
              await app.inject({
                method: "POST",
                url:
                  `/api/auction-sessions/${sessionId}/reset-development-session`
              });

            expect(
              response.statusCode
            ).toBe(200);

            const body = response.json<{
              data: {
                auctionSessionId: string;
                status: string;
                stateVersion: number;
                deletedPlayers: number;
                resetAuctionSessionTeams:
                  number;
              };
              error: null;
            }>();

            expect(body).toMatchObject({
              data: {
                auctionSessionId:
                  sessionId,
                status: "SETUP",
                stateVersion: 0,
                deletedPlayers: 1,
                resetAuctionSessionTeams:
                  1
              },
              error: null
            });

            const [storedSession] =
              await db
                .select()
                .from(auctionSessions)
                .where(
                  eq(
                    auctionSessions.id,
                    sessionId
                  )
                );

            expect(
              storedSession
            ).toMatchObject({
              status: "SETUP",
              stateVersion: 0,
              suspensionReason: null
            });

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
          } finally {
            await cleanupFixture();
          }
        }
      );

      it(
        "returns 409 for a CLOSED session without changing it",
        async () => {
          await createFixture(
            "CLOSED"
          );

          try {
            const response =
              await app.inject({
                method: "POST",
                url:
                  `/api/auction-sessions/${sessionId}/reset-development-session`
              });

            expect(
              response.statusCode
            ).toBe(409);

            expect(
              response.json()
            ).toEqual({
              data: null,
              error: {
                code:
                  "AUCTION_SESSION_CLOSED",
                message:
                  `Auction session "${sessionId}" is closed and cannot be reset`
              }
            });

            const [storedSession] =
              await db
                .select()
                .from(auctionSessions)
                .where(
                  eq(
                    auctionSessions.id,
                    sessionId
                  )
                );

            expect(
              storedSession
            ).toMatchObject({
              status: "CLOSED",
              stateVersion: 7
            });

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
          } finally {
            await cleanupFixture();
          }
        }
      );

      it(
        "returns 404 for a missing development session",
        async () => {
          const response =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/missing-development-reset/reset-development-session"
            });

          expect(
            response.statusCode
          ).toBe(404);

          expect(
            response.json()
          ).toEqual({
            data: null,
            error: {
              code:
                "AUCTION_SESSION_NOT_FOUND",
              message:
                'Auction session "missing-development-reset" was not found'
            }
          });
        }
      );
    }
  );

  describe(
    "POST /api/auction-sessions/:id/reset-setup-data",
    () => {
      const resetLeagueId =
        "league-http-setup-reset";
      const resetSessionId =
        "session-http-setup-reset";
      const resetTeamId =
        "team-http-setup-reset";
      const resetSessionTeamId =
        "session-team-http-setup-reset";
      const resetPlayerId =
        "player-http-setup-reset";
      const resetRosterEntryId =
        "roster-http-setup-reset";

      async function createResetFixture(
        status:
          | "SETUP"
          | "READY" = "SETUP"
      ): Promise<void> {
        await db.insert(leagues).values({
          id: resetLeagueId,
          name: "HTTP Setup Reset League",
          normalizedName:
            "http setup reset league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: resetSessionId,
            leagueId: resetLeagueId,
            season: "2026/2027",
            editionNumber: 92,
            status,
            initialCredits: 300
          });

        await db.insert(teams).values({
          id: resetTeamId,
          leagueId: resetLeagueId,
          name: "HTTP Setup Reset Team"
        });

        await db
          .insert(auctionSessionTeams)
          .values({
            id: resetSessionTeamId,
            auctionSessionId:
              resetSessionId,
            teamId: resetTeamId,
            tableOrder: 1,
            renewalCredits: 0,
            remainingCredits: 247
          });

        await db.insert(players).values({
          id: resetPlayerId,
          auctionSessionId:
            resetSessionId,
          fmsCode: "HTTP-RESET-001",
          name: "HTTP Reset Player",
          normalizedName:
            "http reset player",
          role: "A",
          availabilityStatus:
            "ROSTERED"
        });

        await db
          .insert(rosterEntries)
          .values({
            id: resetRosterEntryId,
            auctionSessionTeamId:
              resetSessionTeamId,
            playerId: resetPlayerId,
            acquisitionCost: 53,
            contractYear: 1,
            source: "INITIAL_ROSTER"
          });
      }

      async function cleanupResetFixture():
        Promise<void> {
        await db
          .delete(rosterEntries)
          .where(
            eq(
              rosterEntries
                .auctionSessionTeamId,
              resetSessionTeamId
            )
          );

        await db
          .delete(players)
          .where(
            eq(
              players.auctionSessionId,
              resetSessionId
            )
          );

        await db
          .delete(auctionSessionTeams)
          .where(
            eq(
              auctionSessionTeams
                .auctionSessionId,
              resetSessionId
            )
          );

        await db
          .delete(teams)
          .where(
            eq(
              teams.id,
              resetTeamId
            )
          );

        await db
          .delete(auctionSessions)
          .where(
            eq(
              auctionSessions.id,
              resetSessionId
            )
          );

        await db
          .delete(leagues)
          .where(
            eq(
              leagues.id,
              resetLeagueId
            )
          );
      }

      it(
        "resets setup archive roster and credits",
        async () => {
          await createResetFixture();

          try {
            const response =
              await app.inject({
                method: "POST",
                url:
                  `/api/auction-sessions/${resetSessionId}/reset-setup-data`
              });

            expect(
              response.statusCode
            ).toBe(200);

            expect(response.json()).toEqual({
              data: {
                deletedRosterEntries: 1,
                deletedPlayers: 1,
                resetTeams: 1
              },
              error: null
            });

            const storedPlayers =
              await db
                .select()
                .from(players)
                .where(
                  eq(
                    players.auctionSessionId,
                    resetSessionId
                  )
                );

            expect(
              storedPlayers
            ).toHaveLength(0);

            const storedRosterEntries =
              await db
                .select()
                .from(rosterEntries)
                .where(
                  eq(
                    rosterEntries
                      .auctionSessionTeamId,
                    resetSessionTeamId
                  )
                );

            expect(
              storedRosterEntries
            ).toHaveLength(0);

            const [storedSessionTeam] =
              await db
                .select()
                .from(auctionSessionTeams)
                .where(
                  eq(
                    auctionSessionTeams.id,
                    resetSessionTeamId
                  )
                );

            expect(
              storedSessionTeam
                ?.remainingCredits
            ).toBe(300);
          } finally {
            await cleanupResetFixture();
          }
        }
      );

      it(
        "returns 409 when operational history exists in SETUP",
        async () => {
          await createResetFixture(
            "SETUP"
          );

          const operationalCallId =
            "call-http-setup-reset";

          await db
            .insert(auctionCalls)
            .values({
              id: operationalCallId,
              auctionSessionId:
                resetSessionId,
              playerId:
                resetPlayerId,
              callerAuctionSessionTeamId:
                resetSessionTeamId,
              status: "CANCELLED",
              openingBid: 1,
              currentBid: 1
            });

          try {
            const response =
              await app.inject({
                method: "POST",
                url:
                  `/api/auction-sessions/${resetSessionId}/reset-setup-data`
              });

            expect(
              response.statusCode
            ).toBe(409);

            expect(
              response.json()
            ).toEqual({
              data: null,
              error: {
                code:
                  "OPERATIONAL_DATA_EXISTS",
                message:
                  "Setup data cannot be reset because the auction session contains operational history. Use the complete development session reset instead."
              }
            });

            const storedPlayers =
              await db
                .select()
                .from(players)
                .where(
                  eq(
                    players.auctionSessionId,
                    resetSessionId
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
                    resetSessionTeamId
                  )
                );

            expect(
              storedRosterEntries
            ).toHaveLength(1);

            const [storedSessionTeam] =
              await db
                .select()
                .from(
                  auctionSessionTeams
                )
                .where(
                  eq(
                    auctionSessionTeams.id,
                    resetSessionTeamId
                  )
                );

            expect(
              storedSessionTeam
                ?.remainingCredits
            ).toBe(247);
          } finally {
            await db
              .delete(auctionCalls)
              .where(
                eq(
                  auctionCalls.id,
                  operationalCallId
                )
              );
          }
        }
      );

      it(
        "returns 409 outside SETUP without changing data",
        async () => {
          await createResetFixture(
            "READY"
          );

          try {
            const response =
              await app.inject({
                method: "POST",
                url:
                  `/api/auction-sessions/${resetSessionId}/reset-setup-data`
              });

            expect(
              response.statusCode
            ).toBe(409);

            expect(response.json()).toEqual({
              data: null,
              error: {
                code:
                  "INVALID_SESSION_STATUS",
                message:
                  "Setup data can only be reset while the auction session is in SETUP"
              }
            });

            const storedPlayers =
              await db
                .select()
                .from(players)
                .where(
                  eq(
                    players.auctionSessionId,
                    resetSessionId
                  )
                );

            expect(
              storedPlayers
            ).toHaveLength(1);

            const [storedSessionTeam] =
              await db
                .select()
                .from(auctionSessionTeams)
                .where(
                  eq(
                    auctionSessionTeams.id,
                    resetSessionTeamId
                  )
                );

            expect(
              storedSessionTeam
                ?.remainingCredits
            ).toBe(247);
          } finally {
            await cleanupResetFixture();
          }
        }
      );

      it(
        "returns 404 for a missing session",
        async () => {
          const response =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/missing-setup-reset/reset-setup-data"
            });

          expect(
            response.statusCode
          ).toBe(404);

          expect(response.json()).toEqual({
            data: null,
            error: {
              code:
                "AUCTION_SESSION_NOT_FOUND",
              message:
                'Auction session "missing-setup-reset" was not found'
            }
          });
        }
      );
    }
  );

  describe("POST /api/player-import/archive", () => {
    const validArchiveContent = [
      "Archivio giocatori FMS ReVo",
      "",
      "\tCod\tFMld\tRuolo\tSquadra\tNome",
      "\t1001\t10\tPortiere\tInter\tSOMMER Yann",
      "\t1002\t20\tDifensore\tMilan\tGABBIA Matteo",
      "\t1003\t30\tCentrocampista\t{SERIE ESTERA}\tTONALI Sandro",
      "\t1004\t40\tAttaccante\tRoma\tDYBALA Paulo",
      ""
    ].join("\n");

    async function createImportSession() {
      await db.insert(leagues).values({
        id: "league-player-import",
        name: "Player Import League",
        normalizedName: "player import league"
      });

      await db.insert(auctionSessions).values({
        id: "session-player-import",
        leagueId: "league-player-import",
        season: "2026/2027",
        editionNumber: 1,
        initialCredits: 330
      });
    }

    it(
      "returns 400 when auction session id is missing",
      async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/player-import/archive",
          payload: {
            content: validArchiveContent
          }
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code: "INVALID_REQUEST",
            message:
              'Body field "auctionSessionId" is required'
          }
        });
      }
    );

    it(
      "returns 400 when the archive is invalid",
      async () => {
        const response = await app.inject({
          method: "POST",
          url: "/api/player-import/archive",
          payload: {
            auctionSessionId: "session-player-import",
            content: [
              "Codice\tRuolo\tNome",
              "1001\tPortiere\tSOMMER Yann"
            ].join("\n")
          }
        });

        expect(response.statusCode).toBe(400);

        const body = response.json<{
          data: null;
          error: {
            code: string;
            message: string;
            issues: Array<{
              rowNumber: number;
              code: string;
              message: string;
            }>;
          };
        }>();

        expect(body.data).toBeNull();
        expect(body.error.code).toBe(
          "INVALID_IMPORT_SOURCE"
        );
        expect(body.error.issues).toEqual([
          {
            rowNumber: 0,
            code: "HEADER_NOT_FOUND",
            message:
              "FMS ReVo archive header was not found"
          }
        ]);
      }
    );

    it(
      "imports all valid archive players",
      async () => {
        await createImportSession();

        const response = await app.inject({
          method: "POST",
          url: "/api/player-import/archive",
          payload: {
            auctionSessionId:
              "session-player-import",
            content: validArchiveContent
          }
        });

        expect(response.statusCode).toBe(201);

        const body = response.json<{
          data: {
            importedPlayers: Array<{
              id: string;
              auctionSessionId: string;
              fmsCode: string;
              name: string;
              normalizedName: string;
              role: string;
              availabilityStatus: string;
              createdAt: string;
              updatedAt: string;
            }>;
            summary: {
              parsedPlayers: number;
              importedPlayers: number;
              issueCount: number;
            };
          };
          error: null;
        }>();

        expect(body.error).toBeNull();

        expect(body.data.summary).toEqual({
          parsedPlayers: 4,
          importedPlayers: 4,
          issueCount: 0
        });

        expect(body.data.importedPlayers).toHaveLength(4);

        expect(body.data.importedPlayers[0]).toEqual({
          id: expect.any(String),
          auctionSessionId:
            "session-player-import",
          fmsCode: "1001",
          name: "SOMMER Yann",
          normalizedName: "sommer yann",
          realTeamName: "Inter",
          role: "P",
          availabilityStatus: "AVAILABLE",
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        });

        expect(
          body.data.importedPlayers[2]
            ?.availabilityStatus
        ).toBe("UNAVAILABLE");

        const storedPlayers = await db
          .select()
          .from(players);

        expect(storedPlayers).toHaveLength(4);
        expect(
          storedPlayers.map((player) => player.fmsCode)
        ).toEqual([
          "1001",
          "1002",
          "1003",
          "1004"
        ]);
      }
    );

    it(
      "rolls back the whole archive when a database write fails",
      async () => {
        await createImportSession();

        sqlite.exec(`
          CREATE TRIGGER
            player_import_force_failure
          BEFORE INSERT ON players
          WHEN NEW.auction_session_id =
            'session-player-import'
           AND NEW.fms_code = '1002'
          BEGIN
            SELECT RAISE(
              ABORT,
              'forced player import failure'
            );
          END;
        `);

        try {
          const response = await app.inject({
            method: "POST",
            url: "/api/player-import/archive",
            payload: {
              auctionSessionId:
                "session-player-import",
              content: validArchiveContent
            }
          });

          expect(response.statusCode).toBe(500);

          const storedPlayers = await db
            .select()
            .from(players)
            .where(
              eq(
                players.auctionSessionId,
                "session-player-import"
              )
            );

          expect(storedPlayers).toHaveLength(0);
        } finally {
          sqlite.exec(`
            DROP TRIGGER IF EXISTS
              player_import_force_failure;
          `);
        }
      }
    );

    it(
      "returns 409 for a duplicated FMS code in the archive",
      async () => {
        const content = [
          "Archivio giocatori FMS ReVo",
          "",
          "\tCod\tFMld\tRuolo\tSquadra\tNome",
          "\t1001\t10\tPortiere\tInter\tSOMMER Yann",
          "\t1001\t20\tDifensore\tMilan\tGABBIA Matteo"
        ].join("\n");

        const response = await app.inject({
          method: "POST",
          url: "/api/player-import/archive",
          payload: {
            auctionSessionId:
              "session-player-import",
            content
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code:
              "PLAYER_FMS_CODE_ALREADY_EXISTS",
            message:
              'Player FMS code "1001" appears more than once in the import'
          }
        });
      }
    );

    it(
      "returns 409 when a player already exists",
      async () => {
        await createImportSession();

        await db.insert(players).values({
          id: "existing-player",
          auctionSessionId:
            "session-player-import",
          fmsCode: "1001",
          name: "SOMMER Yann",
          normalizedName: "sommer yann",
          role: "P",
          availabilityStatus: "AVAILABLE"
        });

        const response = await app.inject({
          method: "POST",
          url: "/api/player-import/archive",
          payload: {
            auctionSessionId:
              "session-player-import",
            content: validArchiveContent
          }
        });

        expect(response.statusCode).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code:
              "PLAYER_FMS_CODE_ALREADY_EXISTS",
            message:
              'Player FMS code "1001" already exists in auction session "session-player-import"'
          }
        });

        const storedPlayers = await db
          .select()
          .from(players);

        expect(storedPlayers).toHaveLength(1);
        expect(storedPlayers[0]?.id).toBe(
          "existing-player"
        );
      }
    );
  });


  describe(
    "POST /api/player-import/initial-rosters with resolutions",
    () => {
      const leagueId =
        "league-initial-roster-resolution";
      const sessionId =
        "session-initial-roster-resolution";
      const teamId =
        "team-initial-roster-resolution";
      const sessionTeamId =
        "session-team-initial-roster-resolution";

      const rosterContent = [
        "Resolution Team",
        "\tRuolo\tNome\tSquadra\tCon\t$Acq",
        "\tAttaccante\tLOOKMAN Ademola\tAtalanta\t4\t7",
        "\tPortiere\tSOMMER Yann\tInter\t1\t18",
        ""
      ].join("\n");

      async function createFixture():
        Promise<void> {
        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Initial Roster Resolution League",
          normalizedName:
            "initial roster resolution league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: sessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 93,
            status: "SETUP",
            initialCredits: 300
          });

        await db.insert(teams).values({
          id: teamId,
          leagueId,
          name: "Resolution Team"
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

        await db.insert(players).values([
          {
            id:
              "player-resolution-lookman",
            auctionSessionId: sessionId,
            fmsCode: "101814",
            name: "LOOKMAN Ademola",
            normalizedName:
              "lookman ademola",
            realTeamName: "Atalanta",
            role: "A",
            availabilityStatus:
              "AVAILABLE"
          },
          {
            id:
              "player-resolution-sommer",
            auctionSessionId: sessionId,
            fmsCode: "100001",
            name: "SOMMER Yann",
            normalizedName:
              "sommer yann",
            realTeamName: "Inter",
            role: "P",
            availabilityStatus:
              "AVAILABLE"
          }
        ]);
      }

      async function cleanupFixture():
        Promise<void> {
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
          .where(
            eq(
              teams.id,
              teamId
            )
          );

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
          .where(
            eq(
              leagues.id,
              leagueId
            )
          );
      }

      it(
        "imports an invalid contract year row after SET_CONTRACT_YEAR resolution",
        async () => {
          await createFixture();

          try {
            const response =
              await app.inject({
                method: "POST",
                url:
                  "/api/player-import/initial-rosters",
                payload: {
                  auctionSessionId:
                    sessionId,
                  content:
                    rosterContent,
                  resolutions: [
                    {
                      rowNumber: 3,
                      action:
                        "SET_CONTRACT_YEAR",
                      contractYear: 3
                    }
                  ]
                }
              });

            expect(
              response.statusCode
            ).toBe(201);

            const body =
              response.json<{
                data: {
                  importedEntries:
                    number;
                  totalCost: number;
                  summary: {
                    parsedRows:
                      number;
                    validEntries:
                      number;
                    parserIssueCount:
                      number;
                    planningIssueCount:
                      number;
                  };
                };
                error: null;
              }>();

            expect(body.error).toBeNull();

            expect(body.data).toEqual({
              importedEntries: 2,
              totalCost: 25,
              summary: {
                parsedRows: 2,
                validEntries: 2,
                parserIssueCount: 0,
                planningIssueCount: 0
              }
            });

            const storedEntries =
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
              storedEntries
            ).toHaveLength(2);

            const lookmanEntry =
              storedEntries.find(
                (entry) =>
                  entry.playerId ===
                  "player-resolution-lookman"
              );

            expect(
              lookmanEntry
                ?.contractYear
            ).toBe(3);

            expect(
              lookmanEntry
                ?.acquisitionCost
            ).toBe(7);

            const [storedSessionTeam] =
              await db
                .select()
                .from(
                  auctionSessionTeams
                )
                .where(
                  eq(
                    auctionSessionTeams.id,
                    sessionTeamId
                  )
                );

            expect(
              storedSessionTeam
                ?.remainingCredits
            ).toBe(275);
          } finally {
            await cleanupFixture();
          }
        }
      );

      it(
        "skips an invalid contract year row after SKIP_ROW resolution",
        async () => {
          await createFixture();

          try {
            const response =
              await app.inject({
                method: "POST",
                url:
                  "/api/player-import/initial-rosters",
                payload: {
                  auctionSessionId:
                    sessionId,
                  content:
                    rosterContent,
                  resolutions: [
                    {
                      rowNumber: 3,
                      action: "SKIP_ROW"
                    }
                  ]
                }
              });

            expect(
              response.statusCode
            ).toBe(201);

            const body =
              response.json<{
                data: {
                  importedEntries:
                    number;
                  totalCost: number;
                  summary: {
                    parsedRows:
                      number;
                    validEntries:
                      number;
                    parserIssueCount:
                      number;
                    planningIssueCount:
                      number;
                  };
                };
                error: null;
              }>();

            expect(body.error).toBeNull();

            expect(body.data).toEqual({
              importedEntries: 1,
              totalCost: 18,
              summary: {
                parsedRows: 1,
                validEntries: 1,
                parserIssueCount: 0,
                planningIssueCount: 0
              }
            });

            const storedEntries =
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
              storedEntries
            ).toHaveLength(1);

            expect(
              storedEntries[0]?.playerId
            ).toBe(
              "player-resolution-sommer"
            );

            expect(
              storedEntries[0]
                ?.acquisitionCost
            ).toBe(18);

            const [storedSessionTeam] =
              await db
                .select()
                .from(
                  auctionSessionTeams
                )
                .where(
                  eq(
                    auctionSessionTeams.id,
                    sessionTeamId
                  )
                );

            expect(
              storedSessionTeam
                ?.remainingCredits
            ).toBe(282);
          } finally {
            await cleanupFixture();
          }
        }
      );
    }
  );

});
