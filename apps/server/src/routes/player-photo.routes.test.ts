import {
  afterAll,
  afterEach,
  beforeAll,
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
  workspaceRoot
} from "../db/client.js";

const photoDirectory =
  path.join(
    workspaceRoot,
    "data",
    "assets",
    "player-photos"
  );

const firstFileName =
  "999990001.png";

const secondFileName =
  "999990002.png";

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

function buildMultipartBody(
  mode: "KEEP" | "REPLACE",
  files: {
    fileName: string;
    content: Buffer;
  }[],
  boundary: string
): Buffer {
  const chunks: Buffer[] = [];

  chunks.push(
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="mode"\r\n\r\n` +
      `${mode}\r\n`
    )
  );

  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="files"; filename="${file.fileName}"\r\n` +
        `Content-Type: image/png\r\n\r\n`
      ),
      file.content,
      Buffer.from("\r\n")
    );
  }

  chunks.push(
    Buffer.from(
      `--${boundary}--\r\n`
    )
  );

  return Buffer.concat(chunks);
}

async function cleanup():
  Promise<void> {
  await Promise.all([
    rm(
      path.join(
        photoDirectory,
        firstFileName
      ),
      {
        force: true
      }
    ),
    rm(
      path.join(
        photoDirectory,
        secondFileName
      ),
      {
        force: true
      }
    )
  ]);
}

describe(
  "player photo routes",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      await cleanup();
      app = await buildApp();
    });

    afterEach(async () => {
      await cleanup();
    });

    afterAll(async () => {
      await cleanup();
      await app.close();
    });

    it(
      "imports multiple PNG files in one request",
      async () => {
        const boundary =
          "----FantaAstaPlayerPhotosMultiple";

        const first =
          fakePng("first");

        const second =
          fakePng("second");

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/player-photos/import",
            headers: {
              "content-type":
                `multipart/form-data; boundary=${boundary}`
            },
            payload:
              buildMultipartBody(
                "KEEP",
                [
                  {
                    fileName:
                      firstFileName,
                    content: first
                  },
                  {
                    fileName:
                      secondFileName,
                    content: second
                  }
                ],
                boundary
              )
          });

        expect(
          response.statusCode
        ).toBe(200);

        expect(
          response.json()
        ).toEqual({
          data: {
            selected: 2,
            created: 2,
            replaced: 0,
            kept: 0,
            rejected: 0,
            issues: []
          },
          error: null
        });

        await expect(
          readFile(
            path.join(
              photoDirectory,
              firstFileName
            )
          )
        ).resolves.toEqual(first);

        await expect(
          readFile(
            path.join(
              photoDirectory,
              secondFileName
            )
          )
        ).resolves.toEqual(second);
      }
    );

    it(
      "honors KEEP and REPLACE across requests",
      async () => {
        const firstBoundary =
          "----FantaAstaPlayerPhotosKeep";

        const original =
          fakePng("original");

        const keepResponse =
          await app.inject({
            method: "POST",
            url:
              "/api/player-photos/import",
            headers: {
              "content-type":
                `multipart/form-data; boundary=${firstBoundary}`
            },
            payload:
              buildMultipartBody(
                "KEEP",
                [
                  {
                    fileName:
                      firstFileName,
                    content: original
                  }
                ],
                firstBoundary
              )
          });

        expect(
          keepResponse.statusCode
        ).toBe(200);

        const secondBoundary =
          "----FantaAstaPlayerPhotosKeepAgain";

        const incoming =
          fakePng("incoming");

        const keptResponse =
          await app.inject({
            method: "POST",
            url:
              "/api/player-photos/import",
            headers: {
              "content-type":
                `multipart/form-data; boundary=${secondBoundary}`
            },
            payload:
              buildMultipartBody(
                "KEEP",
                [
                  {
                    fileName:
                      firstFileName,
                    content: incoming
                  }
                ],
                secondBoundary
              )
          });

        expect(
          keptResponse.json()
        ).toMatchObject({
          data: {
            selected: 1,
            created: 0,
            replaced: 0,
            kept: 1,
            rejected: 0
          },
          error: null
        });

        await expect(
          readFile(
            path.join(
              photoDirectory,
              firstFileName
            )
          )
        ).resolves.toEqual(
          original
        );

        const replaceBoundary =
          "----FantaAstaPlayerPhotosReplace";

        const replaceResponse =
          await app.inject({
            method: "POST",
            url:
              "/api/player-photos/import",
            headers: {
              "content-type":
                `multipart/form-data; boundary=${replaceBoundary}`
            },
            payload:
              buildMultipartBody(
                "REPLACE",
                [
                  {
                    fileName:
                      firstFileName,
                    content: incoming
                  }
                ],
                replaceBoundary
              )
          });

        expect(
          replaceResponse.json()
        ).toMatchObject({
          data: {
            selected: 1,
            created: 0,
            replaced: 1,
            kept: 0,
            rejected: 0
          },
          error: null
        });

        await expect(
          readFile(
            path.join(
              photoDirectory,
              firstFileName
            )
          )
        ).resolves.toEqual(
          incoming
        );
      }
    );

    it(
      "rejects a missing import mode",
      async () => {
        const boundary =
          "----FantaAstaPlayerPhotosNoMode";

        const body =
          Buffer.concat([
            Buffer.from(
              `--${boundary}\r\n` +
              `Content-Disposition: form-data; name="files"; filename="${firstFileName}"\r\n` +
              `Content-Type: image/png\r\n\r\n`
            ),
            fakePng("photo"),
            Buffer.from(
              `\r\n--${boundary}--\r\n`
            )
          ]);

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/player-photos/import",
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
              "INVALID_IMPORT_MODE"
          }
        });
      }
    );
  }
);
