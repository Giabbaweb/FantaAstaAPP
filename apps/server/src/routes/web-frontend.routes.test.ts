import {
  mkdtemp,
  mkdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Fastify from "fastify";
import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  webFrontendRoutes
} from "./web-frontend.routes.js";

const createdApps:
  Array<ReturnType<typeof Fastify>> =
  [];

const temporaryRoots:
  string[] =
  [];

afterEach(async () => {
  while (createdApps.length > 0) {
    const app =
      createdApps.pop();

    if (app) {
      await app.close();
    }
  }

  while (temporaryRoots.length > 0) {
    const root =
      temporaryRoots.pop();

    if (root) {
      await rm(
        root,
        {
          recursive: true,
          force: true
        }
      );
    }
  }
});

async function createWebDistFixture():
  Promise<string> {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-web-frontend-"
      )
    );

  temporaryRoots.push(root);

  await mkdir(
    path.join(
      root,
      "static"
    ),
    {
      recursive: true
    }
  );

  await mkdir(
    path.join(
      root,
      "branding"
    ),
    {
      recursive: true
    }
  );

  await mkdir(
    path.join(
      root,
      "docs"
    ),
    {
      recursive: true
    }
  );

  await writeFile(
    path.join(
      root,
      "index.html"
    ),
    "<!doctype html><html><body>FantaAstaAPP</body></html>",
    "utf-8"
  );

  await writeFile(
    path.join(
      root,
      "static",
      "app.js"
    ),
    "console.log('FantaAstaAPP');",
    "utf-8"
  );

  await writeFile(
    path.join(
      root,
      "branding",
      "logo.png"
    ),
    Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47
    ])
  );

  await writeFile(
    path.join(
      root,
      "docs",
      "guide.pdf"
    ),
    Buffer.from("%PDF-1.4")
  );

  await writeFile(
    path.join(
      root,
      "apple-touch-icon.png"
    ),
    Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47
    ])
  );

  await writeFile(
    path.join(
      root,
      "favicon.ico"
    ),
    Buffer.from([
      0x00,
      0x00,
      0x01,
      0x00
    ])
  );

  return root;
}

describe(
  "webFrontendRoutes",
  () => {
    it(
      "serves SPA routes, static files and keeps backend namespaces separate",
      async () => {
        const root =
          await createWebDistFixture();

        const app =
          Fastify();

        createdApps.push(app);

        await app.register(
          webFrontendRoutes,
          {
            root
          }
        );

        await app.ready();

        for (const url of [
          "/",
          "/readme-first",
          "/public",
          "/admin",
          "/admin/config",
          "/remote",
          "/remote/all"
        ]) {
          const response =
            await app.inject({
              method: "GET",
              url
            });

          expect(
            response.statusCode
          ).toBe(200);

          expect(
            response.headers[
              "content-type"
            ]
          ).toContain(
            "text/html"
          );
        }

        const script =
          await app.inject({
            method: "GET",
            url:
              "/static/app.js"
          });

        expect(
          script.statusCode
        ).toBe(200);

        expect(
          script.headers[
            "content-type"
          ]
        ).toContain(
          "application/javascript"
        );

        const branding =
          await app.inject({
            method: "GET",
            url:
              "/branding/logo.png"
          });

        expect(
          branding.statusCode
        ).toBe(200);

        expect(
          branding.headers[
            "content-type"
          ]
        ).toContain(
          "image/png"
        );

        const documentation =
          await app.inject({
            method: "GET",
            url:
              "/docs/guide.pdf"
          });

        expect(
          documentation.statusCode
        ).toBe(200);

        expect(
          documentation.headers[
            "content-type"
          ]
        ).toContain(
          "application/pdf"
        );

        const icon =
          await app.inject({
            method: "GET",
            url:
              "/apple-touch-icon.png"
          });

        expect(
          icon.statusCode
        ).toBe(200);

        const favicon =
          await app.inject({
            method: "GET",
            url:
              "/favicon.ico"
          });

        expect(
          favicon.statusCode
        ).toBe(200);

        expect(
          favicon.headers[
            "content-type"
          ]
        ).toContain(
          "image/vnd.microsoft.icon"
        );

        const missingApi =
          await app.inject({
            method: "GET",
            url:
              "/api/questa-route-non-esiste"
          });

        expect(
          missingApi.statusCode
        ).toBe(404);

        const missingRuntimeAsset =
          await app.inject({
            method: "GET",
            url:
              "/assets/questa-route-non-esiste.png"
          });

        expect(
          missingRuntimeAsset.statusCode
        ).toBe(404);
      }
    );
  }
);
