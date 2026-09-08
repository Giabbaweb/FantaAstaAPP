import {
  setTeamAccessPinSchema
} from "@fantaastaapp/contracts";
import type {
  SetTeamAccessPinInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapTeamAccessError
} from "../http/team-access-errors.js";
import type {
  TeamAccessNotFoundResponse
} from "../http/team-access-errors.js";
import {
  SqliteTeamAccessRepository
} from "../realtime/team-access.repository.js";
import {
  TeamAccessService
} from "../realtime/team-access.service.js";
import type {
  TeamAccessStatus
} from "../realtime/team-access.service.js";

type TeamAccessParams = {
  id: string;
};

type AuctionSessionTeamAccessParams = {
  auctionSessionId: string;
};

type TeamAccessStatusListResponse = {
  data: TeamAccessStatus[];
  error: null;
};

type TeamAccessVerificationResponse = {
  data: {
    valid: boolean;
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

const repository =
  new SqliteTeamAccessRepository();

const service =
  new TeamAccessService(repository);

export const teamAccessRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Params: AuctionSessionTeamAccessParams;
        Reply: TeamAccessStatusListResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/team-access",
        async (request, reply) => {
          const status =
            await service.listSessionAccessStatus(
              request.params.auctionSessionId
            );

          return reply.code(200).send({
            data: status,
            error: null
          });
        }
      );

      fastify.post<{
        Params: TeamAccessParams;
        Body: SetTeamAccessPinInput;
        Reply:
          | TeamAccessVerificationResponse
          | InvalidRequestResponse
          | TeamAccessNotFoundResponse;
      }>(
        "/api/auction-session-teams/:id/access-pin/verify",
        async (request, reply) => {
          const validation =
            setTeamAccessPinSchema.safeParse(
              request.body
            );

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  validation.error.issues
                    .map(
                      (issue) =>
                        issue.message
                    )
                    .join("; ")
              }
            });
          }

          try {
            const valid =
              await service.verifyAccessPin(
                request.params.id,
                validation.data.pin
              );

            return reply.code(200).send({
              data: {
                valid
              },
              error: null
            });
          } catch (error) {
            const mapped =
              mapTeamAccessError(error);

            if (mapped) {
              return reply
                .code(mapped.statusCode)
                .send(mapped.body);
            }

            throw error;
          }
        }
      );

      fastify.put<{
        Params: TeamAccessParams;
        Body: SetTeamAccessPinInput;
        Reply:
          | void
          | InvalidRequestResponse
          | TeamAccessNotFoundResponse;
      }>(
        "/api/auction-session-teams/:id/access-pin",
        async (request, reply) => {
          const validation =
            setTeamAccessPinSchema.safeParse(
              request.body
            );

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  validation.error.issues
                    .map(
                      (issue) =>
                        issue.message
                    )
                    .join("; ")
              }
            });
          }

          try {
            await service.setAccessPin(
              request.params.id,
              validation.data.pin
            );

            return reply
              .code(204)
              .send();
          } catch (error) {
            const mapped =
              mapTeamAccessError(error);

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
