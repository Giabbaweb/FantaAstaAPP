import {
  createAuctionSessionTeamSchema,
  reorderAuctionSessionTeamsSchema,
  updateAuctionSessionTeamSchema
} from "@fantaastaapp/contracts";
import type {
  AuctionSessionTeam,
  CreateAuctionSessionTeamInput,
  ReorderAuctionSessionTeamsInput,
  UpdateAuctionSessionTeamInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapAuctionSessionTeamError
} from "../http/auction-session-team-errors.js";
import type {
  AuctionSessionTeamInvalidReorderResponse,
  AuctionSessionTeamNotFoundResponse,
  AuctionSessionTeamReorderNotAllowedResponse
} from "../http/auction-session-team-errors.js";
import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import {
  SqliteAuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";
import {
  AuctionSessionTeamService
} from "../services/auction-session-team.service.js";

type AuctionSessionParams = {
  auctionSessionId: string;
};

type AuctionSessionTeamParams = {
  auctionSessionId: string;
  teamId: string;
};

type AuctionSessionTeamListResponse = {
  data: AuctionSessionTeam[];
  error: null;
};

type AuctionSessionTeamDetailResponse = {
  data: AuctionSessionTeam;
  error: null;
};

type CreateAuctionSessionTeamResponse = {
  data: AuctionSessionTeam;
  error: null;
};

type UpdateAuctionSessionTeamResponse = {
  data: AuctionSessionTeam;
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
  new SqliteAuctionSessionTeamRepository();

const auctionSessionRepository =
  new SqliteAuctionSessionRepository();

const service =
  new AuctionSessionTeamService(
    repository,
    auctionSessionRepository
  );

export const auctionSessionTeamRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Params: AuctionSessionParams;
        Reply: AuctionSessionTeamListResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/teams",
        async (request, reply) => {
          const sessionTeams =
            await service.listSessionTeams(
              request.params.auctionSessionId
            );

          return reply.code(200).send({
            data: sessionTeams,
            error: null
          });
        }
      );

      fastify.put<{
        Params: AuctionSessionParams;
        Body: ReorderAuctionSessionTeamsInput;
        Reply:
          | AuctionSessionTeamListResponse
          | InvalidRequestResponse
          | AuctionSessionTeamInvalidReorderResponse
          | AuctionSessionTeamReorderNotAllowedResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/teams/reorder",
        async (request, reply) => {
          const validation =
            reorderAuctionSessionTeamsSchema
              .safeParse(
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
            const reordered =
              await service
                .reorderSessionTeams(
                  request.params
                    .auctionSessionId,
                  validation.data.teamIds
                );

            return reply.code(200).send({
              data: reordered,
              error: null
            });
          } catch (error) {
            const mapped =
              mapAuctionSessionTeamError(
                error
              );

            if (
              mapped &&
              mapped.statusCode === 400
            ) {
              return reply
                .code(400)
                .send(mapped.body);
            }

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

      fastify.get<{
        Params: AuctionSessionTeamParams;
        Reply:
          | AuctionSessionTeamDetailResponse
          | AuctionSessionTeamNotFoundResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/teams/:teamId",
        async (request, reply) => {
          const {
            auctionSessionId,
            teamId
          } = request.params;

          try {
            const sessionTeam =
              await service.getSessionTeam(
                auctionSessionId,
                teamId
              );

            return reply.code(200).send({
              data: sessionTeam,
              error: null
            });
          } catch (error) {
            const mapped =
              mapAuctionSessionTeamError(error);

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
        Params: AuctionSessionParams;
        Body: CreateAuctionSessionTeamInput;
        Reply:
          | CreateAuctionSessionTeamResponse
          | InvalidRequestResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/teams",
        async (request, reply) => {
          const validation =
            createAuctionSessionTeamSchema.safeParse(
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

          const sessionTeam =
            await service.createSessionTeam(
              request.params.auctionSessionId,
              validation.data
            );

          return reply.code(201).send({
            data: sessionTeam,
            error: null
          });
        }
      );

      fastify.patch<{
        Params: AuctionSessionTeamParams;
        Body: UpdateAuctionSessionTeamInput;
        Reply:
          | UpdateAuctionSessionTeamResponse
          | InvalidRequestResponse
          | AuctionSessionTeamNotFoundResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/teams/:teamId",
        async (request, reply) => {
          const validation =
            updateAuctionSessionTeamSchema.safeParse(
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

          const {
            auctionSessionId,
            teamId
          } = request.params;

          try {
            const sessionTeam =
              await service.updateSessionTeam(
                auctionSessionId,
                teamId,
                validation.data
              );

            return reply.code(200).send({
              data: sessionTeam,
              error: null
            });
          } catch (error) {
            const mapped =
              mapAuctionSessionTeamError(error);

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
        Params: AuctionSessionTeamParams;
        Reply:
          | void
          | AuctionSessionTeamNotFoundResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/teams/:teamId",
        async (request, reply) => {
          const {
            auctionSessionId,
            teamId
          } = request.params;

          try {
            await service.deleteSessionTeam(
              auctionSessionId,
              teamId
            );

            return reply.code(204).send();
          } catch (error) {
            const mapped =
              mapAuctionSessionTeamError(error);

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
