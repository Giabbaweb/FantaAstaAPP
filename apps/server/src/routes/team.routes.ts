import {
  createTeamSchema,
  updateTeamSchema
} from "@fantaastaapp/contracts";
import type {
  CreateTeamInput,
  Team,
  UpdateTeamInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapTeamError
} from "../http/team-errors.js";
import type {
  TeamNotFoundResponse
} from "../http/team-errors.js";
import {
  SqliteTeamRepository
} from "../repositories/team.repository.js";
import {
  TeamService
} from "../services/team.service.js";

type TeamListQuery = {
  leagueId?: string;
};

type TeamParams = {
  id: string;
};

type TeamListResponse = {
  data: Team[];
  error: null;
};

type TeamDetailResponse = {
  data: Team;
  error: null;
};

type CreateTeamResponse = {
  data: Team;
  error: null;
};

type UpdateTeamResponse = {
  data: Team;
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

const repository = new SqliteTeamRepository();
const service = new TeamService(repository);

export const teamRoutes: FastifyPluginAsync =
  async (fastify) => {
    fastify.get<{
      Querystring: TeamListQuery;
      Reply: TeamListResponse;
    }>(
      "/api/teams",
      async (request, reply) => {
        const { leagueId } = request.query;

        const teams = leagueId
          ? await service.listTeamsByLeagueId(
              leagueId
            )
          : await service.listTeams();

        return reply.code(200).send({
          data: teams,
          error: null
        });
      }
    );

    fastify.get<{
      Params: TeamParams;
      Reply:
        | TeamDetailResponse
        | TeamNotFoundResponse;
    }>(
      "/api/teams/:id",
      async (request, reply) => {
        try {
          const team = await service.getTeamById(
            request.params.id
          );

          return reply.code(200).send({
            data: team,
            error: null
          });
        } catch (error) {
          const mapped = mapTeamError(error);

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
      Body: CreateTeamInput;
      Reply:
        | CreateTeamResponse
        | InvalidRequestResponse;
    }>(
      "/api/teams",
      async (request, reply) => {
        const validation =
          createTeamSchema.safeParse(
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

        const team = await service.createTeam(
          validation.data
        );

        return reply.code(201).send({
          data: team,
          error: null
        });
      }
    );

    fastify.patch<{
      Params: TeamParams;
      Body: UpdateTeamInput;
      Reply:
        | UpdateTeamResponse
        | InvalidRequestResponse
        | TeamNotFoundResponse;
    }>(
      "/api/teams/:id",
      async (request, reply) => {
        const validation =
          updateTeamSchema.safeParse(
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
          const team = await service.updateTeam(
            request.params.id,
            validation.data
          );

          return reply.code(200).send({
            data: team,
            error: null
          });
        } catch (error) {
          const mapped = mapTeamError(error);

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
      Params: TeamParams;
      Reply:
        | void
        | TeamNotFoundResponse;
    }>(
      "/api/teams/:id",
      async (request, reply) => {
        try {
          await service.deleteTeam(
            request.params.id
          );

          return reply.code(204).send();
        } catch (error) {
          const mapped = mapTeamError(error);

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
