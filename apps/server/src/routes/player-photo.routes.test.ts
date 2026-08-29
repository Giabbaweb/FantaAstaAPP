import {
  afterAll,
  afterEach,
  beforeAll,
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

import multipart from "@fastify/multipart";
import Fastify from "fastify";

import {
  createPlayerPhotoRoutes
} from "./player-photo.routes.js";

let photoDirectory = "";

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
    const app = Fastify({
      logger: false
    });

    beforeAll(async () => {
      photoDirectory =
        await mkdtemp(
          path.join(
            os.tmpdir(),
            "fantaasta-player-photo-routes-"
          )
        );

      await app.register(
        multipart
      );

      await app.register(
        createPlayerPhotoRoutes(
          photoDirectory
        )
      );

      await app.ready();
    });

    afterEach(async () => {
      await cleanup();
    });

    afterAll(async () => {
      await app.close();

      await rm(
        photoDirectory,
        {
          recursive: true,
          force: true
        }
      );
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
      "serves a managed player photo",
      async () => {
        const content =
          fakePng("served");

        await writeFile(
          path.join(
            photoDirectory,
            firstFileName
          ),
          content
        );

        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/player-photos/999990001"
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
          response.headers[
            "cache-control"
          ]
        ).toBe(
          "no-cache"
        );

        expect(
          response.rawPayload
        ).toEqual(
          content
        );
      }
    );

    it(
      "returns 404 for a missing player photo",
      async () => {
        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/player-photos/999999999"
          });

        expect(
          response.statusCode
        ).toBe(404);
      }
    );

    it(
      "returns 404 for a non-numeric player photo code",
      async () => {
        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/player-photos/not-a-code"
          });

        expect(
          response.statusCode
        ).toBe(404);
      }
    );

    it(
      "deletes all managed player photos",
      async () => {
        const boundary =
          "----FantaAstaPlayerPhotosDelete";

        const uploadResponse =
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
                    content:
                      fakePng("first")
                  },
                  {
                    fileName:
                      secondFileName,
                    content:
                      fakePng("second")
                  }
                ],
                boundary
              )
          });

        expect(
          uploadResponse.statusCode
        ).toBe(200);

        const beforeDelete =
          await app.inject({
            method: "GET",
            url:
              "/api/player-photos"
          });

        expect(
          beforeDelete.statusCode
        ).toBe(200);

        expect(
          beforeDelete.json()
        ).toMatchObject({
          data: {
            count: 2
          },
          error: null
        });

        const deleteResponse =
          await app.inject({
            method: "DELETE",
            url:
              "/api/player-photos"
          });

        expect(
          deleteResponse.statusCode
        ).toBe(200);

        expect(
          deleteResponse.json()
        ).toEqual({
          data: {
            deleted: 2
          },
          error: null
        });

        const afterDelete =
          await app.inject({
            method: "GET",
            url:
              "/api/player-photos"
          });

        expect(
          afterDelete.statusCode
        ).toBe(200);

        expect(
          afterDelete.json()
        ).toEqual({
          data: {
            count: 0,
            lastUpdatedAt: null
          },
          error: null
        });
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
