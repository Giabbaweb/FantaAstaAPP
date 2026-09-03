import {
  afterAll,
  beforeAll,
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
  fmsSessionExports,
  leagues
} from "../db/schema/index.js";

describe(
  "FMS session export state routes",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    async function seedSession(
      suffix: string,
      status:
        | "COMPLETED"
        | "RUNNING"
    ): Promise<string> {
      const leagueId =
        `league-fms-export-state-http-${suffix}`;

      const sessionId =
        `session-fms-export-state-http-${suffix}`;

      await db.insert(leagues).values({
        id: leagueId,
        name:
          `FMS Export State HTTP ${suffix}`,
        normalizedName:
          `fms export state http ${suffix}`
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber:
          suffix === "get-empty"
            ? 80
            : suffix === "confirm"
              ? 81
              : 82,
        initialCredits: 300,
        status
      });

      return sessionId;
    }

    it(
      "returns null before export confirmation",
      async () => {
        const sessionId =
          await seedSession(
            "get-empty",
            "COMPLETED"
          );

        const response =
          await app.inject({
            method: "GET",
            url:
              `/api/auction-sessions/${sessionId}/fms-export-state`
          });

        expect(
          response.statusCode
        ).toBe(200);

        expect(response.json()).toEqual({
          data: null,
          error: null
        });
      }
    );

    it(
      "confirms and exposes persisted export state",
      async () => {
        const sessionId =
          await seedSession(
            "confirm",
            "COMPLETED"
          );

        const confirmResponse =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${sessionId}/fms-export-state/confirm`
          });

        expect(
          confirmResponse.statusCode
        ).toBe(200);

        expect(
          confirmResponse.json()
        ).toEqual({
          data: expect.objectContaining({
            auctionSessionId:
              sessionId,
            exportedAt:
              expect.any(String)
          }),
          error: null
        });

        const getResponse =
          await app.inject({
            method: "GET",
            url:
              `/api/auction-sessions/${sessionId}/fms-export-state`
          });

        expect(
          getResponse.statusCode
        ).toBe(200);

        expect(
          getResponse.json()
        ).toEqual({
          data: expect.objectContaining({
            auctionSessionId:
              sessionId,
            exportedAt:
              expect.any(String)
          }),
          error: null
        });
      }
    );

    it(
      "returns 409 when confirming a non-completed session",
      async () => {
        const sessionId =
          await seedSession(
            "running",
            "RUNNING"
          );

        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/auction-sessions/${sessionId}/fms-export-state/confirm`
          });

        expect(
          response.statusCode
        ).toBe(409);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code:
              "AUCTION_SESSION_NOT_COMPLETED",
            message: expect.any(String)
          }
        });
      }
    );

    it(
      "returns 404 for a missing session",
      async () => {
        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/auction-sessions/missing-fms-export-state/fms-export-state"
          });

        expect(
          response.statusCode
        ).toBe(404);

        expect(response.json()).toEqual({
          data: null,
          error: {
            code:
              "AUCTION_SESSION_NOT_FOUND",
            message: expect.any(String)
          }
        });
      }
    );
  }
);
