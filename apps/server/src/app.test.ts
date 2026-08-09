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
  leagues,
  players
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
      initialCredits: 330,
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
            status: "READY"
          }),
          error: null
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
            status: "SETUP"
          });

          const executeCommand = async (
            command: string
          ) =>
            app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                "session-command-lifecycle/" +
                `commands/${command}`
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
            await executeCommand("suspend");

          expect(suspendResponse.statusCode).toBe(200);
          expect(suspendResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "SUSPENDED"
            }),
            error: null
          });

          const resumeResponse =
            await executeCommand("resume");

          expect(resumeResponse.statusCode).toBe(200);
          expect(resumeResponse.json()).toEqual({
            data: expect.objectContaining({
              id: "session-command-lifecycle",
              status: "RUNNING"
            }),
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
        "returns 400 for an unknown command",
        async () => {
          const response = await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-command-invalid/" +
              "commands/reopen"
          });

          expect(response.statusCode).toBe(400);

          expect(response.json()).toEqual({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                'Unknown auction session command "reopen"'
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
              status: "READY"
            },
            {
              id: "session-command-conflicting",
              leagueId:
                "league-command-active-conflict",
              season: "2026/2027",
              editionNumber: 35,
              initialCredits: 330,
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

});
