import {
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import type {
  League
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  workspaceRoot
} from "../db/client.js";
import {
  SqliteLeagueRepository
} from "../repositories/league.repository.js";
import {
  LeagueService,
  LeagueServiceError
} from "../services/league.service.js";

type LeagueLogoParams = {
  leagueId: string;
};

type LeagueLogoResponse = {
  data: League;
  error: null;
};

type LeagueLogoErrorResponse = {
  data: null;
  error: {
    code:
      | "LEAGUE_NOT_FOUND"
      | "INVALID_LEAGUE_LOGO";
    message: string;
  };
};

const MAX_LOGO_SIZE_BYTES =
  2 * 1024 * 1024;

const extensionByMimeType =
  new Map<string, string>([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"]
  ]);

const repository =
  new SqliteLeagueRepository();

const service =
  new LeagueService(repository);

function hasValidSignature(
  content: Buffer,
  mimeType: string
): boolean {
  if (
    mimeType === "image/png"
  ) {
    return (
      content.length >= 8 &&
      content[0] === 0x89 &&
      content[1] === 0x50 &&
      content[2] === 0x4e &&
      content[3] === 0x47 &&
      content[4] === 0x0d &&
      content[5] === 0x0a &&
      content[6] === 0x1a &&
      content[7] === 0x0a
    );
  }

  if (
    mimeType === "image/jpeg"
  ) {
    return (
      content.length >= 3 &&
      content[0] === 0xff &&
      content[1] === 0xd8 &&
      content[2] === 0xff
    );
  }

  if (
    mimeType === "image/webp"
  ) {
    return (
      content.length >= 12 &&
      content
        .subarray(0, 4)
        .toString("ascii") ===
        "RIFF" &&
      content
        .subarray(8, 12)
        .toString("ascii") ===
        "WEBP"
    );
  }

  return false;
}

async function removeOtherLogoVariants(
  directory: string,
  leagueId: string,
  extensionToKeep: string
): Promise<void> {
  for (
    const extension of
    [".png", ".jpg", ".jpeg", ".webp"]
  ) {
    if (
      extension === extensionToKeep
    ) {
      continue;
    }

    await rm(
      path.join(
        directory,
        `${leagueId}${extension}`
      ),
      {
        force: true
      }
    );
  }
}

export const leagueLogoRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.post<{
        Params: LeagueLogoParams;
        Reply:
          | LeagueLogoResponse
          | LeagueLogoErrorResponse;
      }>(
        "/api/leagues/:leagueId/logo",
        async (request, reply) => {
          let league: League;

          try {
            league =
              await service.getLeagueById(
                request.params.leagueId
              );
          } catch (error) {
            if (
              error instanceof
                LeagueServiceError &&
              error.code ===
                "LEAGUE_NOT_FOUND"
            ) {
              return reply
                .code(404)
                .send({
                  data: null,
                  error: {
                    code:
                      "LEAGUE_NOT_FOUND",
                    message:
                      error.message
                  }
                });
            }

            throw error;
          }

          const part =
            await request.file({
              limits: {
                files: 1,
                fileSize:
                  MAX_LOGO_SIZE_BYTES
              }
            });

          if (!part) {
            return reply
              .code(400)
              .send({
                data: null,
                error: {
                  code:
                    "INVALID_LEAGUE_LOGO",
                  message:
                    "Seleziona un file logo."
                }
              });
          }

          const extension =
            extensionByMimeType.get(
              part.mimetype
            );

          if (!extension) {
            return reply
              .code(400)
              .send({
                data: null,
                error: {
                  code:
                    "INVALID_LEAGUE_LOGO",
                  message:
                    "Formato logo non supportato. Usa PNG, JPEG o WEBP."
                }
              });
          }

          let content: Buffer;

          try {
            content =
              await part.toBuffer();
          } catch (error) {
            if (
              error instanceof Error &&
              (
                error.name ===
                  "RequestFileTooLargeError" ||
                error.message
                  .toLowerCase()
                  .includes(
                    "file too large"
                  )
              )
            ) {
              return reply
                .code(400)
                .send({
                  data: null,
                  error: {
                    code:
                      "INVALID_LEAGUE_LOGO",
                    message:
                      "Il logo supera la dimensione massima di 2 MB."
                  }
                });
            }

            throw error;
          }

          if (
            content.length === 0 ||
            !hasValidSignature(
              content,
              part.mimetype
            )
          ) {
            return reply
              .code(400)
              .send({
                data: null,
                error: {
                  code:
                    "INVALID_LEAGUE_LOGO",
                  message:
                    "Il file non contiene un'immagine valida."
                }
              });
          }

          const directory =
            path.join(
              workspaceRoot,
              "data",
              "assets",
              "league-logos"
            );

          const fileName =
            `${league.id}${extension}`;

          const filePath =
            path.join(
              directory,
              fileName
            );

          const logoPath =
            `/assets/league-logos/${encodeURIComponent(
              fileName
            )}`;

          await writeFile(
            filePath,
            content
          );

          try {
            const updatedLeague =
              await service.updateLeague(
                league.id,
                {
                  logoPath
                }
              );

            await removeOtherLogoVariants(
              directory,
              league.id,
              extension
            );

            return reply
              .code(200)
              .send({
                data: updatedLeague,
                error: null
              });
          } catch (error) {
            await rm(
              filePath,
              {
                force: true
              }
            );

            throw error;
          }
        }
      );
    };
