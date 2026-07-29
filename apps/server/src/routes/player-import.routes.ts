import type {
  Player
} from "@fantaastaapp/contracts";
import {
  normalizePlayerName
} from "@fantaastaapp/domain";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  FmsRevoArchiveParser
} from "../import/fms-revo-archive.parser.js";
import type {
  PlayerImportIssue
} from "../import/player-import.types.js";
import {
  SqlitePlayerRepository
} from "../repositories/player.repository.js";
import {
  PlayerService,
  PlayerServiceError
} from "../services/player.service.js";

type PlayerArchiveImportBody = {
  auctionSessionId?: string;
  content?: string;
};

type PlayerArchiveImportResponse = {
  data: {
    importedPlayers: Player[];
    summary: {
      parsedPlayers: number;
      importedPlayers: number;
      issueCount: number;
    };
  };
  error: null;
};

type InvalidRequestResponse = {
  data: null;
  error: {
    code: "INVALID_REQUEST";
    message: string;
  };
};

type InvalidImportSourceResponse = {
  data: null;
  error: {
    code: "INVALID_IMPORT_SOURCE";
    message: string;
    issues: PlayerImportIssue[];
  };
};

type ImportConflictResponse = {
  data: null;
  error: {
    code:
      | "PLAYER_FMS_CODE_ALREADY_EXISTS"
      | "PLAYER_NAME_ALREADY_EXISTS";
    message: string;
  };
};

const parser = new FmsRevoArchiveParser();
const repository = new SqlitePlayerRepository();
const service = new PlayerService(repository);

export const playerImportRoutes: FastifyPluginAsync =
  async (fastify) => {
    fastify.post<{
      Body: PlayerArchiveImportBody;
      Reply:
        | PlayerArchiveImportResponse
        | InvalidRequestResponse
        | InvalidImportSourceResponse
        | ImportConflictResponse;
    }>(
      "/api/player-import/archive",
      async (request, reply) => {
        const auctionSessionId =
          request.body?.auctionSessionId?.trim();

        const content = request.body?.content;

        if (!auctionSessionId) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                'Body field "auctionSessionId" is required'
            }
          });
        }

        if (
          typeof content !== "string" ||
          !content.trim()
        ) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                'Body field "content" is required'
            }
          });
        }

        const parseResult = parser.parse({
          format: "FMS_REVO_ARCHIVE_TAB",
          auctionSessionId,
          content
        });

        if (parseResult.issues.length > 0) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_IMPORT_SOURCE",
              message:
                "Player archive contains invalid rows",
              issues: parseResult.issues
            }
          });
        }

        const importedFmsCodes = new Set<string>();
        const importedNormalizedNames =
          new Set<string>();

        for (const player of parseResult.players) {
          if (importedFmsCodes.has(player.fmsCode)) {
            return reply.code(409).send({
              data: null,
              error: {
                code:
                  "PLAYER_FMS_CODE_ALREADY_EXISTS",
                message:
                  `Player FMS code "${player.fmsCode}" appears more than once in the import`
              }
            });
          }

          importedFmsCodes.add(player.fmsCode);

          const normalizedName =
            normalizePlayerName(player.name);

          if (
            importedNormalizedNames.has(
              normalizedName
            )
          ) {
            return reply.code(409).send({
              data: null,
              error: {
                code:
                  "PLAYER_NAME_ALREADY_EXISTS",
                message:
                  `Player name "${player.name}" appears more than once in the import`
              }
            });
          }

          importedNormalizedNames.add(
            normalizedName
          );

          const existingByFmsCode =
            await repository.findByFmsCode(
              auctionSessionId,
              player.fmsCode
            );

          if (existingByFmsCode) {
            return reply.code(409).send({
              data: null,
              error: {
                code:
                  "PLAYER_FMS_CODE_ALREADY_EXISTS",
                message:
                  `Player FMS code "${player.fmsCode}" already exists in auction session "${auctionSessionId}"`
              }
            });
          }

          const existingByName =
            await repository.findByNormalizedName(
              auctionSessionId,
              normalizedName
            );

          if (existingByName) {
            return reply.code(409).send({
              data: null,
              error: {
                code:
                  "PLAYER_NAME_ALREADY_EXISTS",
                message:
                  `Player name "${player.name}" already exists in auction session "${auctionSessionId}"`
              }
            });
          }
        }

        const importedPlayers: Player[] = [];

        try {
          for (const playerInput of parseResult.players) {
            const player =
              await service.createPlayer(
                playerInput
              );

            importedPlayers.push(player);
          }
        } catch (error) {
          if (
            error instanceof PlayerServiceError &&
            (
              error.code ===
                "PLAYER_FMS_CODE_ALREADY_EXISTS" ||
              error.code ===
                "PLAYER_NAME_ALREADY_EXISTS"
            )
          ) {
            return reply.code(409).send({
              data: null,
              error: {
                code: error.code,
                message: error.message
              }
            });
          }

          throw error;
        }

        return reply.code(201).send({
          data: {
            importedPlayers,
            summary: {
              parsedPlayers:
                parseResult.players.length,
              importedPlayers:
                importedPlayers.length,
              issueCount: 0
            }
          },
          error: null
        });
      }
    );
  };
