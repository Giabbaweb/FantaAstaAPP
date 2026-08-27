import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  mkdtemp,
  mkdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PlayerPhotoCatalogService
} from "./player-photo-catalog.service.js";

const roots: string[] = [];

async function createRoot():
  Promise<string> {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-player-photos-"
      )
    );

  roots.push(root);

  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map(
      (root) =>
        rm(
          root,
          {
            recursive: true,
            force: true
          }
        )
    )
  );
});

describe(
  "PlayerPhotoCatalogService",
  () => {
    it(
      "returns an empty catalog for a missing directory",
      async () => {
        const root =
          await createRoot();

        const directory =
          path.join(
            root,
            "missing"
          );

        const service =
          new PlayerPhotoCatalogService(
            directory
          );

        await expect(
          service.getCatalog()
        ).resolves.toEqual({
          count: 0,
          lastUpdatedAt: null
        });
      }
    );

    it(
      "counts only numeric PNG player photos",
      async () => {
        const root =
          await createRoot();

        await mkdir(
          root,
          {
            recursive: true
          }
        );

        await writeFile(
          path.join(
            root,
            "100002.png"
          ),
          "photo"
        );

        await writeFile(
          path.join(
            root,
            "100010.PNG"
          ),
          "photo"
        );

        await writeFile(
          path.join(
            root,
            "player-test.png"
          ),
          "ignored"
        );

        await writeFile(
          path.join(
            root,
            "100020.jpg"
          ),
          "ignored"
        );

        const service =
          new PlayerPhotoCatalogService(
            root
          );

        const catalog =
          await service.getCatalog();

        expect(
          catalog.count
        ).toBe(2);

        expect(
          catalog.lastUpdatedAt
        ).not.toBeNull();
      }
    );
  }
);
