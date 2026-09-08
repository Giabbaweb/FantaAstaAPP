import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  readFile,
  rm
} from "node:fs/promises";
import path from "node:path";

import {
  buildApp
} from "../app.js";
import {
  db,
  workspaceRoot
} from "../db/client.js";
import {
  leagues
} from "../db/schema/index.js";

describe(
  "league logo routes",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    const leagueId =
      "league-logo-test";

    const assetDirectory =
      path.join(
        workspaceRoot,
        "data",
        "assets",
        "league-logos"
      );

    const assetPath =
      path.join(
        assetDirectory,
        `${leagueId}.png`
      );

    beforeAll(async () => {
      app = await buildApp();
    });

    beforeEach(async () => {
      await db.insert(leagues).values({
        id: leagueId,
        name: "League Logo Test",
        normalizedName:
          "league logo test"
      });
    });

    afterEach(async () => {
      await rm(
        assetPath,
        {
          force: true
        }
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "uploads a PNG league logo and updates logoPath",
      async () => {
        const png =
          Buffer.from([
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a,
            0x00,
            0x00,
            0x00,
            0x00
          ]);

        const boundary =
          "----FantaAstaLeagueBoundary";

        const body =
          Buffer.concat([
            Buffer.from(
              `--${boundary}\r\n` +
              `Content-Disposition: form-data; name="file"; filename="logo.png"\r\n` +
              `Content-Type: image/png\r\n\r\n`
            ),
            png,
            Buffer.from(
              `\r\n--${boundary}--\r\n`
            )
          ]);

        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/leagues/${leagueId}/logo`,
            headers: {
              "content-type":
                `multipart/form-data; boundary=${boundary}`
            },
            payload: body
          });

        expect(
          response.statusCode
        ).toBe(200);

        const expectedLogoPath =
          `/assets/league-logos/${leagueId}.png`;

        expect(
          response.json()
        ).toMatchObject({
          data: {
            id: leagueId,
            logoPath:
              expectedLogoPath
          },
          error: null
        });

        const [persistedLeague] =
          await db
            .select()
            .from(leagues);

        expect(
          persistedLeague?.logoPath
        ).toBe(
          expectedLogoPath
        );

        const stored =
          await readFile(
            assetPath
          );

        expect(stored).toEqual(
          png
        );

        const assetResponse =
          await app.inject({
            method: "GET",
            url:
              expectedLogoPath
          });

        expect(
          assetResponse.statusCode
        ).toBe(200);

        expect(
          assetResponse.headers[
            "content-type"
          ]
        ).toContain(
          "image/png"
        );
      }
    );

    it(
      "rejects a file with an invalid PNG signature",
      async () => {
        const invalid =
          Buffer.from(
            "not-a-real-png"
          );

        const boundary =
          "----FantaAstaInvalidLeagueBoundary";

        const body =
          Buffer.concat([
            Buffer.from(
              `--${boundary}\r\n` +
              `Content-Disposition: form-data; name="file"; filename="fake.png"\r\n` +
              `Content-Type: image/png\r\n\r\n`
            ),
            invalid,
            Buffer.from(
              `\r\n--${boundary}--\r\n`
            )
          ]);

        const response =
          await app.inject({
            method: "POST",
            url:
              `/api/leagues/${leagueId}/logo`,
            headers: {
              "content-type":
                `multipart/form-data; boundary=${boundary}`
            },
            payload: body
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
              "INVALID_LEAGUE_LOGO"
          }
        });
      }
    );

    it(
      "returns 404 for an unknown league",
      async () => {
        const boundary =
          "----FantaAstaMissingLeague";

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/leagues/missing-league/logo",
            headers: {
              "content-type":
                `multipart/form-data; boundary=${boundary}`
            },
            payload:
              `--${boundary}--\r\n`
          });

        expect(
          response.statusCode
        ).toBe(404);

        expect(
          response.json()
        ).toMatchObject({
          data: null,
          error: {
            code:
              "LEAGUE_NOT_FOUND"
          }
        });
      }
    );
  }
);
