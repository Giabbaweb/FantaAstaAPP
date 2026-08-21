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
  leagues,
  teams
} from "../db/schema/index.js";

describe(
  "team logo routes",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    const leagueId =
      "league-team-logo-test";

    const teamId =
      "team-logo-test";

    const assetDirectory =
      path.join(
        workspaceRoot,
        "data",
        "assets",
        "team-logos",
        leagueId
      );

    beforeAll(async () => {
      app = await buildApp();
    });

    beforeEach(async () => {
      await db.insert(leagues).values({
        id: leagueId,
        name: "Team Logo League",
        normalizedName:
          "team logo league"
      });

      await db.insert(teams).values({
        id: teamId,
        leagueId,
        name: "Team Logo Test",
        shortName: "TLT"
      });
    });

    afterEach(async () => {
      await rm(
        assetDirectory,
        {
          recursive: true,
          force: true
        }
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "uploads a PNG team logo and updates logoPath",
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
          "----FantaAstaBoundary";

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
              `/api/teams/${teamId}/logo`,
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
          `/assets/team-logos/${leagueId}/${teamId}.png`;

        expect(
          response.json()
        ).toMatchObject({
          data: {
            id: teamId,
            leagueId,
            logoPath:
              expectedLogoPath
          },
          error: null
        });

        const [persistedTeam] =
          await db
            .select()
            .from(teams);

        expect(
          persistedTeam?.logoPath
        ).toBe(
          expectedLogoPath
        );

        const stored =
          await readFile(
            path.join(
              assetDirectory,
              `${teamId}.png`
            )
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
          "----FantaAstaInvalidBoundary";

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
              `/api/teams/${teamId}/logo`,
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
              "INVALID_TEAM_LOGO"
          }
        });
      }
    );

    it(
      "returns 404 for an unknown team",
      async () => {
        const boundary =
          "----FantaAstaMissingTeam";

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/teams/missing-team/logo",
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
              "TEAM_NOT_FOUND"
          }
        });
      }
    );
  }
);
