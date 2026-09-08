import type {
  FastifyPluginAsync
} from "fastify";

import {
  SetupDataResetServiceError
} from "../services/setup-data-reset.service.js";
import type {
  SetupDataResetResult,
  SetupDataResetService
} from "../services/setup-data-reset.service.js";

type SetupDataResetParams = {
  id: string;
};

type SetupDataResetServicePort = Pick<
  SetupDataResetService,
  "execute"
>;

type SetupDataResetResponse = {
  data: SetupDataResetResult;
  error: null;
};

type SetupDataResetErrorResponse = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export function setupDataResetRoutes(
  setupDataResetService:
    SetupDataResetServicePort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post<{
      Params: SetupDataResetParams;
      Reply:
        | SetupDataResetResponse
        | SetupDataResetErrorResponse;
    }>(
      "/api/auction-sessions/:id/reset-setup-data",
      async (request, reply) => {
        try {
          const result =
            setupDataResetService.execute(
              request.params.id
            );

          return reply.code(200).send({
            data: result,
            error: null
          });
        } catch (error) {
          if (
            error instanceof
              SetupDataResetServiceError
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
              "INVALID_SESSION_STATUS" ||
              error.code ===
              "OPERATIONAL_DATA_EXISTS"
            ) {
              return reply.code(409).send({
                data: null,
                error: {
                  code: error.code,
                  message: error.message
                }
              });
            }

            return reply.code(500).send({
              data: null,
              error: {
                code: error.code,
                message: error.message
              }
            });
          }

          throw error;
        }
      }
    );
  };
}
