import type {
  FastifyPluginAsync
} from "fastify";

import {
  DevelopmentSessionResetError
} from "../services/development-session-reset.service.js";
import type {
  DevelopmentSessionResetResult,
  DevelopmentSessionResetService
} from "../services/development-session-reset.service.js";

type DevelopmentSessionResetParams = {
  id: string;
};

type DevelopmentSessionResetServicePort = Pick<
  DevelopmentSessionResetService,
  "reset"
>;

type DevelopmentSessionResetResponse = {
  data: DevelopmentSessionResetResult;
  error: null;
};

type DevelopmentSessionResetErrorResponse = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export function developmentSessionResetRoutes(
  developmentSessionResetService:
    DevelopmentSessionResetServicePort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post<{
      Params: DevelopmentSessionResetParams;
      Reply:
        | DevelopmentSessionResetResponse
        | DevelopmentSessionResetErrorResponse;
    }>(
      "/api/auction-sessions/:id/reset-development-session",
      async (request, reply) => {
        try {
          const result =
            await developmentSessionResetService
              .reset(
                request.params.id
              );

          return reply.code(200).send({
            data: result,
            error: null
          });
        } catch (error) {
          if (
            error instanceof
              DevelopmentSessionResetError
          ) {
            if (
              error.code ===
              "AUCTION_SESSION_NOT_FOUND"
            ) {
              return reply.code(404).send({
                data: null,
                error: {
                  code: error.code,
                  message: error.message
                }
              });
            }

            if (
              error.code ===
              "AUCTION_SESSION_CLOSED"
            ) {
              return reply.code(409).send({
                data: null,
                error: {
                  code: error.code,
                  message: error.message
                }
              });
            }
          }

          throw error;
        }
      }
    );
  };
}
