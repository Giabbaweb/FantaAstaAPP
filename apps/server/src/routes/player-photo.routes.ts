import {
  readFile
} from "node:fs/promises";
import path from "node:path";

import type {
  FastifyPluginAsync
} from "fastify";

import {
  workspaceRoot
} from "../db/client.js";

import {
  PlayerPhotoCatalogService
} from "../services/player-photo-catalog.service.js";
import {
  PlayerPhotoDeletionService,
  type PlayerPhotoDeletionResult
} from "../services/player-photo-deletion.service.js";
import {
  PlayerPhotoImportService,
  type PlayerPhotoImportFile,
  type PlayerPhotoImportMode,
  type PlayerPhotoImportResult
} from "../services/player-photo-import.service.js";

type PlayerPhotoCatalogResponse = {
  data: {
    count: number;
    lastUpdatedAt: string | null;
  };
  error: null;
};

type PlayerPhotoImportResponse = {
  data: PlayerPhotoImportResult;
  error: null;
};

type PlayerPhotoDeletionResponse = {
  data: PlayerPhotoDeletionResult;
  error: null;
};

type PlayerPhotoImportErrorResponse = {
  data: null;
  error: {
    code:
      | "INVALID_MULTIPART_REQUEST"
      | "INVALID_IMPORT_MODE"
      | "NO_FILES";
    message: string;
  };
};

const playerPhotosDirectory =
  path.join(
    workspaceRoot,
    "data",
    "assets",
    "player-photos"
  );

const importLimits = {
  files: 1000,
  fileSize: 2 * 1024 * 1024,
  parts: 1001
};

function isImportMode(
  value: unknown
): value is PlayerPhotoImportMode {
  return (
    value === "KEEP" ||
    value === "REPLACE"
  );
}

export function createPlayerPhotoRoutes(
  photosDirectory:
    string = playerPhotosDirectory
): FastifyPluginAsync {
  const catalogService =
    new PlayerPhotoCatalogService(
      photosDirectory
    );

  const importService =
    new PlayerPhotoImportService(
      photosDirectory
    );

  const deletionService =
    new PlayerPhotoDeletionService(
      photosDirectory
    );

  return async (fastify) => {
      fastify.get<{
        Params: {
          fmsCode: string;
        };
      }>(
        "/api/player-photos/:fmsCode",
        async (request, reply) => {
          const { fmsCode } =
            request.params;

          if (!/^\d+$/.test(fmsCode)) {
            return reply
              .code(404)
              .send();
          }

          const filePath =
            path.join(
              photosDirectory,
              `${fmsCode}.png`
            );

          try {
            const content =
              await readFile(filePath);

            return reply
              .type("image/png")
              .header(
                "Cache-Control",
                "no-cache"
              )
              .code(200)
              .send(content);
          } catch (error) {
            if (
              error instanceof Error &&
              "code" in error &&
              error.code === "ENOENT"
            ) {
              return reply
                .code(404)
                .send();
            }

            throw error;
          }
        }
      );

      fastify.get<{
        Reply: PlayerPhotoCatalogResponse;
      }>(
        "/api/player-photos",
        async (_request, reply) => {
          const catalog =
            await catalogService.getCatalog();

          return reply
            .code(200)
            .send({
              data: catalog,
              error: null
            });
        }
      );

      fastify.post<{
        Reply:
          | PlayerPhotoImportResponse
          | PlayerPhotoImportErrorResponse;
      }>(
        "/api/player-photos/import",
        async (request, reply) => {
          if (!request.isMultipart()) {
            return reply
              .code(400)
              .send({
                data: null,
                error: {
                  code:
                    "INVALID_MULTIPART_REQUEST",
                  message:
                    "La richiesta deve essere multipart/form-data"
                }
              });
          }

          let mode:
            PlayerPhotoImportMode | null =
              null;

          const files:
            PlayerPhotoImportFile[] = [];

          for await (
            const part of request.parts({
              limits: importLimits
            })
          ) {
            if (part.type === "file") {
              files.push({
                fileName:
                  part.filename,
                content:
                  await part.toBuffer()
              });

              continue;
            }

            if (
              part.fieldname === "mode"
            ) {
              if (
                typeof part.value ===
                "string" &&
                isImportMode(
                  part.value
                )
              ) {
                mode = part.value;
              } else {
                return reply
                  .code(400)
                  .send({
                    data: null,
                    error: {
                      code:
                        "INVALID_IMPORT_MODE",
                      message:
                        "La modalità deve essere KEEP oppure REPLACE"
                    }
                  });
              }
            }
          }

          if (!mode) {
            return reply
              .code(400)
              .send({
                data: null,
                error: {
                  code:
                    "INVALID_IMPORT_MODE",
                  message:
                    "La modalità KEEP o REPLACE è obbligatoria"
                }
              });
          }

          if (files.length === 0) {
            return reply
              .code(400)
              .send({
                data: null,
                error: {
                  code: "NO_FILES",
                  message:
                    "Selezionare almeno un file PNG"
                }
              });
          }

          const result =
            await importService.importPhotos(
              files,
              mode
            );

          return reply
            .code(200)
            .send({
              data: result,
              error: null
            });
        }
      );

      fastify.delete<{
        Reply:
          PlayerPhotoDeletionResponse;
      }>(
        "/api/player-photos",
        async (_request, reply) => {
          const result =
            await deletionService.deleteAll();

          return reply
            .code(200)
            .send({
              data: result,
              error: null
            });
        }
      );
  };
}

export const playerPhotoRoutes =
  createPlayerPhotoRoutes();
