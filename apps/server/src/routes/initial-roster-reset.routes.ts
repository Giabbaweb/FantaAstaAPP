import type {
  FastifyPluginAsync
} from "fastify";

import {
  InitialRosterResetServiceError
} from "../services/initial-roster-reset.service.js";
import type {
  InitialRosterResetResult,
  InitialRosterResetService
} from "../services/initial-roster-reset.service.js";

type InitialRosterResetParams = {
  id: string;
};

type InitialRosterResetServicePort = Pick<
  InitialRosterResetService,
  "execute"
>;

type InitialRosterResetResponse = {
  data: InitialRosterResetResult;
  error: null;
};

type InitialRosterResetErrorResponse = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export function initialRosterResetRoutes(
  initialRosterResetService:
    InitialRosterResetServicePort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post<{
      Params: InitialRosterResetParams;
      Reply:
        | InitialRosterResetResponse
        | InitialRosterResetErrorResponse;
    }>(
      "/api/auction-sessions/:id/reset-initial-rosters",
      async (request, reply) => {
        try {
          const result =
            initialRosterResetService.execute(
              request.params.id
            );

          return reply.code(200).send({
            data: result,
            error: null
          });
        } catch (error) {
          if (
            error instanceof
              InitialRosterResetServiceError
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
              "INVALID_SESSION_STATUS"
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
