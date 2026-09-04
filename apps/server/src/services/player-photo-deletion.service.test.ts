import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  mkdtemp,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PlayerPhotoDeletionService
} from "./player-photo-deletion.service.js";

const roots: string[] = [];

async function createRoot():
  Promise<string> {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-photo-delete-"
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
  "PlayerPhotoDeletionService",
  () => {
    it(
      "returns zero for a missing directory",
      async () => {
        const root =
          await createRoot();

        const missing =
          path.join(
            root,
            "missing"
          );

        const service =
          new PlayerPhotoDeletionService(
            missing
          );

        await expect(
          service.deleteAll()
        ).resolves.toEqual({
          deleted: 0
        });
      }
    );

    it(
      "deletes managed numeric PNG JPG and JPEG files",
      async () => {
        const root =
          await createRoot();

        await Promise.all([
          writeFile(
            path.join(
              root,
              "100002.png"
            ),
            "photo"
          ),
          writeFile(
            path.join(
              root,
              "100010.PNG"
            ),
            "photo"
          ),
          writeFile(
            path.join(
              root,
              ".gitkeep"
            ),
            ""
          ),
          writeFile(
            path.join(
              root,
              "notes.txt"
            ),
            "keep"
          ),
          writeFile(
            path.join(
              root,
              "player.png"
            ),
            "keep"
          ),
          writeFile(
            path.join(
              root,
              "100020.jpg"
            ),
            "photo"
          ),
          writeFile(
            path.join(
              root,
              "100030.jpeg"
            ),
            "photo"
          ),
          writeFile(
            path.join(
              root,
              "player.jpg"
            ),
            "keep"
          )
        ]);

        const service =
          new PlayerPhotoDeletionService(
            root
          );

        await expect(
          service.deleteAll()
        ).resolves.toEqual({
          deleted: 4
        });

        const remaining =
          (
            await readdir(root)
          ).sort();

        expect(
          remaining
        ).toEqual([
          ".gitkeep",
          "notes.txt",
          "player.jpg",
          "player.png"
        ]);
      }
    );

    it(
      "returns zero when no managed photos exist",
      async () => {
        const root =
          await createRoot();

        await writeFile(
          path.join(
            root,
            ".gitkeep"
          ),
          ""
        );

        const service =
          new PlayerPhotoDeletionService(
            root
          );

        await expect(
          service.deleteAll()
        ).resolves.toEqual({
          deleted: 0
        });

        await expect(
          readdir(root)
        ).resolves.toEqual([
          ".gitkeep"
        ]);
      }
    );
  }
);
