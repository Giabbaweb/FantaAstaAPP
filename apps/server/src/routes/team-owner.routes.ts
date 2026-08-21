import {
  createTeamOwnerSchema,
  updateTeamOwnerSchema
} from "@fantaastaapp/contracts";
import type {
  CreateTeamOwnerInput,
  TeamOwner,
  UpdateTeamOwnerInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapTeamOwnerError
} from "../http/team-owner-errors.js";
import type {
  TeamOwnerConflictResponse,
  TeamOwnerNotFoundResponse
} from "../http/team-owner-errors.js";
import {
  SqliteTeamOwnerRepository
} from "../repositories/team-owner.repository.js";
import {
  TeamOwnerService
} from "../services/team-owner.service.js";

type TeamParams = {
  teamId: string;
};

type TeamOwnerParams = {
  teamId: string;
  ownerId: string;
};

type TeamOwnerListResponse = {
  data: TeamOwner[];
  error: null;
};

type TeamOwnerDetailResponse = {
  data: TeamOwner;
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
    .map(
      (issue) => issue.message
    )
    .join("; ");
}

const repository =
  new SqliteTeamOwnerRepository();

const service =
  new TeamOwnerService(repository);

export const teamOwnerRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Params: TeamParams;
        Reply: TeamOwnerListResponse;
      }>(
        "/api/teams/:teamId/owners",
        async (request, reply) => {
          const owners =
            await service.listTeamOwners(
              request.params.teamId
            );

          return reply.code(200).send({
            data: owners,
            error: null
          });
        }
      );

      fastify.get<{
        Params: TeamOwnerParams;
        Reply:
          | TeamOwnerDetailResponse
          | TeamOwnerNotFoundResponse;
      }>(
        "/api/teams/:teamId/owners/:ownerId",
        async (request, reply) => {
          const {
            teamId,
            ownerId
          } = request.params;

          try {
            const owner =
              await service.getTeamOwner(
                teamId,
                ownerId
              );

            return reply.code(200).send({
              data: owner,
              error: null
            });
          } catch (error) {
            const mapped =
              mapTeamOwnerError(error);

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
        Params: TeamParams;
        Body: CreateTeamOwnerInput;
        Reply:
          | TeamOwnerDetailResponse
          | InvalidRequestResponse
          | TeamOwnerConflictResponse;
      }>(
        "/api/teams/:teamId/owners",
        async (request, reply) => {
          const validation =
            createTeamOwnerSchema.safeParse(
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
            const owner =
              await service.createTeamOwner(
                request.params.teamId,
                validation.data
              );

            return reply.code(201).send({
              data: owner,
              error: null
            });
          } catch (error) {
            const mapped =
              mapTeamOwnerError(error);

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
        Params: TeamOwnerParams;
        Body: UpdateTeamOwnerInput;
        Reply:
          | TeamOwnerDetailResponse
          | InvalidRequestResponse
          | TeamOwnerNotFoundResponse;
      }>(
        "/api/teams/:teamId/owners/:ownerId",
        async (request, reply) => {
          const validation =
            updateTeamOwnerSchema.safeParse(
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

          const {
            teamId,
            ownerId
          } = request.params;

          try {
            const owner =
              await service.updateTeamOwner(
                teamId,
                ownerId,
                validation.data
              );

            return reply.code(200).send({
              data: owner,
              error: null
            });
          } catch (error) {
            const mapped =
              mapTeamOwnerError(error);

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

      fastify.delete<{
        Params: TeamOwnerParams;
        Reply:
          | void
          | TeamOwnerNotFoundResponse;
      }>(
        "/api/teams/:teamId/owners/:ownerId",
        async (request, reply) => {
          const {
            teamId,
            ownerId
          } = request.params;

          try {
            await service.deleteTeamOwner(
              teamId,
              ownerId
            );

            return reply
              .code(204)
              .send();
          } catch (error) {
            const mapped =
              mapTeamOwnerError(error);

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
    };
