import {
  createPlayerSchema,
  updatePlayerSchema
} from "@fantaastaapp/contracts";
import type {
  CreatePlayerInput,
  Player,
  UpdatePlayerInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapPlayerError
} from "../http/player-errors.js";
import type {
  PlayerConflictResponse,
  PlayerNotFoundResponse
} from "../http/player-errors.js";
import {
  SqlitePlayerRepository
} from "../repositories/player.repository.js";
import {
  PlayerService
} from "../services/player.service.js";

type PlayerListQuery = {
  auctionSessionId?: string;
};

type PlayerParams = {
  id: string;
};

type PlayerListResponse = {
  data: Player[];
  error: null;
};

type PlayerDetailResponse = {
  data: Player;
  error: null;
};

type CreatePlayerResponse = {
  data: Player;
  error: null;
};

type UpdatePlayerResponse = {
  data: Player;
  error: null;
};

type InvalidRequestResponse = {
  data: null;
  error: {
    code: "INVALID_REQUEST";
    message: string;
  };
};

function formatValidationError(
  issues: {
    message: string;
  }[]
): string {
  return issues
    .map((issue) => issue.message)
    .join("; ");
}

const repository = new SqlitePlayerRepository();
const service = new PlayerService(repository);

export const playerRoutes: FastifyPluginAsync =
  async (fastify) => {
    fastify.get<{
      Querystring: PlayerListQuery;
      Reply:
        | PlayerListResponse
        | InvalidRequestResponse;
    }>(
      "/api/players",
      async (request, reply) => {
        const auctionSessionId =
          request.query.auctionSessionId?.trim();

        if (!auctionSessionId) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                'Query parameter "auctionSessionId" is required'
            }
          });
        }

        const players =
          await service.listPlayersByAuctionSessionId(
            auctionSessionId
          );

        return reply.code(200).send({
          data: players,
          error: null
        });
      }
    );

    fastify.get<{
      Params: PlayerParams;
      Reply:
        | PlayerDetailResponse
        | PlayerNotFoundResponse;
    }>(
      "/api/players/:id",
      async (request, reply) => {
        try {
          const player = await service.getPlayerById(
            request.params.id
          );

          return reply.code(200).send({
            data: player,
            error: null
          });
        } catch (error) {
          const mapped = mapPlayerError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );

    fastify.post<{
      Body: CreatePlayerInput;
      Reply:
        | CreatePlayerResponse
        | InvalidRequestResponse
        | PlayerConflictResponse;
    }>(
      "/api/players",
      async (request, reply) => {
        const validation =
          createPlayerSchema.safeParse(
            request.body
          );

        if (!validation.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message: formatValidationError(
                validation.error.issues
              )
            }
          });
        }

        try {
          const player = await service.createPlayer(
            validation.data
          );

          return reply.code(201).send({
            data: player,
            error: null
          });
        } catch (error) {
          const mapped = mapPlayerError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );

    fastify.patch<{
      Params: PlayerParams;
      Body: UpdatePlayerInput;
      Reply:
        | UpdatePlayerResponse
        | InvalidRequestResponse
        | PlayerNotFoundResponse
        | PlayerConflictResponse;
    }>(
      "/api/players/:id",
      async (request, reply) => {
        const validation =
          updatePlayerSchema.safeParse(
            request.body
          );

        if (!validation.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message: formatValidationError(
                validation.error.issues
              )
            }
          });
        }

        try {
          const player = await service.updatePlayer(
            request.params.id,
            validation.data
          );

          return reply.code(200).send({
            data: player,
            error: null
          });
        } catch (error) {
          const mapped = mapPlayerError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );

    fastify.delete<{
      Params: PlayerParams;
      Reply:
        | void
        | PlayerNotFoundResponse;
    }>(
      "/api/players/:id",
      async (request, reply) => {
        try {
          await service.deletePlayer(
            request.params.id
          );

          return reply.code(204).send();
        } catch (error) {
          const mapped = mapPlayerError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );
  };
