import type {
  FastifyPluginAsync
} from "fastify";

import {
  PlayerPhotoCatalogService
} from "../services/player-photo-catalog.service.js";
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

const catalogService =
  new PlayerPhotoCatalogService();

const importService =
  new PlayerPhotoImportService();

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

export const playerPhotoRoutes:
  FastifyPluginAsync =
    async (fastify) => {
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
    };
