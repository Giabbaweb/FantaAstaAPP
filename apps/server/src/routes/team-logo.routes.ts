import {
  mkdir,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import type {
  Team
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  workspaceRoot
} from "../db/client.js";
import {
  SqliteTeamRepository
} from "../repositories/team.repository.js";
import {
  TeamService,
  TeamServiceError
} from "../services/team.service.js";

type TeamLogoParams = {
  teamId: string;
};

type TeamLogoResponse = {
  data: Team;
  error: null;
};

type TeamLogoErrorResponse = {
  data: null;
  error: {
    code:
      | "TEAM_NOT_FOUND"
      | "INVALID_TEAM_LOGO";
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
  new SqliteTeamRepository();

const service =
  new TeamService(repository);

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
  teamId: string,
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
        `${teamId}${extension}`
      ),
      {
        force: true
      }
    );
  }
}

export const teamLogoRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.post<{
        Params: TeamLogoParams;
        Reply:
          | TeamLogoResponse
          | TeamLogoErrorResponse;
      }>(
        "/api/teams/:teamId/logo",
        async (request, reply) => {
          let team: Team;

          try {
            team =
              await service.getTeamById(
                request.params.teamId
              );
          } catch (error) {
            if (
              error instanceof
                TeamServiceError &&
              error.code ===
                "TEAM_NOT_FOUND"
            ) {
              return reply
                .code(404)
                .send({
                  data: null,
                  error: {
                    code:
                      "TEAM_NOT_FOUND",
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
                    "INVALID_TEAM_LOGO",
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
                    "INVALID_TEAM_LOGO",
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
                      "INVALID_TEAM_LOGO",
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
                    "INVALID_TEAM_LOGO",
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
              "team-logos",
              team.leagueId
            );

          await mkdir(
            directory,
            {
              recursive: true
            }
          );

          const fileName =
            `${team.id}${extension}`;

          const filePath =
            path.join(
              directory,
              fileName
            );

          const logoPath =
            `/assets/team-logos/${encodeURIComponent(
              team.leagueId
            )}/${encodeURIComponent(
              fileName
            )}`;

          await writeFile(
            filePath,
            content
          );

          try {
            const updatedTeam =
              await service.updateTeam(
                team.id,
                {
                  logoPath
                }
              );

            await removeOtherLogoVariants(
              directory,
              team.id,
              extension
            );

            return reply
              .code(200)
              .send({
                data: updatedTeam,
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
