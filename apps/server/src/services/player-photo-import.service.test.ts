import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  PlayerPhotoImportService
} from "./player-photo-import.service.js";

const roots: string[] = [];

const pngHeader =
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

function fakePng(
  marker: string
): Buffer {
  return Buffer.concat([
    pngHeader,
    Buffer.from(marker)
  ]);
}

async function createRoot():
  Promise<string> {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-photo-import-"
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
  "PlayerPhotoImportService",
  () => {
    it(
      "imports valid numeric PNG files",
      async () => {
        const root =
          await createRoot();

        const service =
          new PlayerPhotoImportService(
            root
          );

        const result =
          await service.importPhotos(
            [
              {
                fileName:
                  "100002.png",
                content:
                  fakePng("first")
              },
              {
                fileName:
                  "100010.PNG",
                content:
                  fakePng("second")
              }
            ],
            "KEEP"
          );

        expect(result).toEqual({
          selected: 2,
          created: 2,
          replaced: 0,
          kept: 0,
          rejected: 0,
          issues: []
        });

        await expect(
          readFile(
            path.join(
              root,
              "100002.png"
            )
          )
        ).resolves.toEqual(
          fakePng("first")
        );

        await expect(
          readFile(
            path.join(
              root,
              "100010.png"
            )
          )
        ).resolves.toEqual(
          fakePng("second")
        );
      }
    );

    it(
      "rejects invalid names and non-PNG content without aborting the batch",
      async () => {
        const root =
          await createRoot();

        const service =
          new PlayerPhotoImportService(
            root
          );

        const result =
          await service.importPhotos(
            [
              {
                fileName:
                  "player.png",
                content:
                  fakePng("bad-name")
              },
              {
                fileName:
                  "100020.png",
                content:
                  Buffer.from(
                    "not a png"
                  )
              },
              {
                fileName:
                  "100030.png",
                content:
                  fakePng("valid")
              }
            ],
            "KEEP"
          );

        expect(result).toEqual({
          selected: 3,
          created: 1,
          replaced: 0,
          kept: 0,
          rejected: 2,
          issues: [
            {
              fileName:
                "player.png",
              reason:
                "INVALID_FILENAME"
            },
            {
              fileName:
                "100020.png",
              reason:
                "INVALID_PNG"
            }
          ]
        });
      }
    );

    it(
      "keeps an existing photo in KEEP mode",
      async () => {
        const root =
          await createRoot();

        const existing =
          fakePng("existing");

        await writeFile(
          path.join(
            root,
            "100040.png"
          ),
          existing
        );

        const service =
          new PlayerPhotoImportService(
            root
          );

        const result =
          await service.importPhotos(
            [
              {
                fileName:
                  "100040.png",
                content:
                  fakePng("incoming")
              }
            ],
            "KEEP"
          );

        expect(result).toEqual({
          selected: 1,
          created: 0,
          replaced: 0,
          kept: 1,
          rejected: 0,
          issues: []
        });

        await expect(
          readFile(
            path.join(
              root,
              "100040.png"
            )
          )
        ).resolves.toEqual(
          existing
        );
      }
    );

    it(
      "replaces an existing photo in REPLACE mode",
      async () => {
        const root =
          await createRoot();

        await writeFile(
          path.join(
            root,
            "100050.png"
          ),
          fakePng("old")
        );

        const incoming =
          fakePng("new");

        const service =
          new PlayerPhotoImportService(
            root
          );

        const result =
          await service.importPhotos(
            [
              {
                fileName:
                  "100050.png",
                content:
                  incoming
              }
            ],
            "REPLACE"
          );

        expect(result).toEqual({
          selected: 1,
          created: 0,
          replaced: 1,
          kept: 0,
          rejected: 0,
          issues: []
        });

        await expect(
          readFile(
            path.join(
              root,
              "100050.png"
            )
          )
        ).resolves.toEqual(
          incoming
        );
      }
    );
  }
);
