import {
  createLeagueSchema,
  updateLeagueSchema
} from "@fantaastaapp/contracts";
import type {
  CreateLeagueInput,
  League,
  UpdateLeagueInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapLeagueError
} from "../http/league-errors.js";
import type {
  LeagueNameConflictResponse,
  LeagueNotFoundResponse
} from "../http/league-errors.js";
import {
  SqliteLeagueRepository
} from "../repositories/league.repository.js";
import {
  LeagueService
} from "../services/league.service.js";

type LeagueParams = {
  id: string;
};

type LeagueListResponse = {
  data: League[];
  error: null;
};

type LeagueDetailResponse = {
  data: League;
  error: null;
};

type CreateLeagueResponse = {
  data: League;
  error: null;
};

type UpdateLeagueResponse = {
  data: League;
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

const repository =
  new SqliteLeagueRepository();

const service =
  new LeagueService(repository);

export const leagueRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Reply: LeagueListResponse;
      }>(
        "/api/leagues",
        async (_request, reply) => {
          const leagues =
            await service.listLeagues();

          return reply.code(200).send({
            data: leagues,
            error: null
          });
        }
      );

      fastify.get<{
        Params: LeagueParams;
        Reply:
          | LeagueDetailResponse
          | LeagueNotFoundResponse;
      }>(
        "/api/leagues/:id",
        async (request, reply) => {
          try {
            const league =
              await service.getLeagueById(
                request.params.id
              );

            return reply.code(200).send({
              data: league,
              error: null
            });
          } catch (error) {
            const mapped =
              mapLeagueError(error);

            if (
              mapped &&
              mapped.statusCode === 404
            ) {
              return reply
                .code(404)
                .send(mapped.body);
            }

            throw error;
          }
        }
      );

      fastify.post<{
        Body: CreateLeagueInput;
        Reply:
          | CreateLeagueResponse
          | InvalidRequestResponse
          | LeagueNameConflictResponse;
      }>(
        "/api/leagues",
        async (request, reply) => {
          const validation =
            createLeagueSchema.safeParse(
              request.body
            );

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  formatValidationError(
                    validation.error.issues
                  )
              }
            });
          }

          try {
            const league =
              await service.createLeague(
                validation.data
              );

            return reply.code(201).send({
              data: league,
              error: null
            });
          } catch (error) {
            const mapped =
              mapLeagueError(error);

            if (
              mapped &&
              mapped.statusCode === 409
            ) {
              return reply
                .code(409)
                .send(mapped.body);
            }

            throw error;
          }
        }
      );

      fastify.patch<{
        Params: LeagueParams;
        Body: UpdateLeagueInput;
        Reply:
          | UpdateLeagueResponse
          | InvalidRequestResponse
          | LeagueNotFoundResponse
          | LeagueNameConflictResponse;
      }>(
        "/api/leagues/:id",
        async (request, reply) => {
          const validation =
            updateLeagueSchema.safeParse(
              request.body
            );

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  formatValidationError(
                    validation.error.issues
                  )
              }
            });
          }

          try {
            const league =
              await service.updateLeague(
                request.params.id,
                validation.data
              );

            return reply.code(200).send({
              data: league,
              error: null
            });
          } catch (error) {
            const mapped =
              mapLeagueError(error);

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
