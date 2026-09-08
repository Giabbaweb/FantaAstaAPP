import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import {
  mkdir,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import {
  buildApp
} from "../app.js";
import {
  workspaceRoot
} from "../db/client.js";

describe(
  "runtime asset routes",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    const testRoot =
      path.join(
        workspaceRoot,
        "data",
        "assets",
        "team-logos",
        "test-runtime-assets"
      );

    beforeAll(async () => {
      app = await buildApp();
    });

    afterEach(async () => {
      await rm(
        testRoot,
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
      "serves a PNG runtime asset",
      async () => {
        await mkdir(
          testRoot,
          {
            recursive: true
          }
        );

        const content =
          Buffer.from([
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a
          ]);

        await writeFile(
          path.join(
            testRoot,
            "team-test.png"
          ),
          content
        );

        const response =
          await app.inject({
            method: "GET",
            url:
              "/assets/team-logos/test-runtime-assets/team-test.png"
          });

        expect(
          response.statusCode
        ).toBe(200);

        expect(
          response.headers[
            "content-type"
          ]
        ).toContain(
          "image/png"
        );

        expect(
          response.rawPayload
        ).toEqual(content);
      }
    );

    it(
      "returns 404 for a missing asset",
      async () => {
        const response =
          await app.inject({
            method: "GET",
            url:
              "/assets/team-logos/test-runtime-assets/missing.png"
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
              "ASSET_NOT_FOUND"
          }
        });
      }
    );

    it(
      "rejects unsupported file types",
      async () => {
        const response =
          await app.inject({
            method: "GET",
            url:
              "/assets/team-logos/test-runtime-assets/file.txt"
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
              "ASSET_NOT_FOUND"
          }
        });
      }
    );
  }
);
