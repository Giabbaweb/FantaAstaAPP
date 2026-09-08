import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapFmsSessionExportStateError
} from "../http/fms-session-export-state-errors.js";
import type {
  FmsSessionExportPersistenceRecord
} from "../repositories/fms-session-export.repository.js";
import type {
  FmsSessionExportStateService
} from "../services/fms-session-export-state.service.js";

type FmsSessionExportStateParams = {
  id: string;
};

type FmsSessionExportStateResponse = {
  data:
    FmsSessionExportPersistenceRecord |
    null;
  error: null;
};

type FmsSessionExportStatePort = Pick<
  FmsSessionExportStateService,
  | "getStatus"
  | "confirm"
>;

export function fmsSessionExportStateRoutes(
  service: FmsSessionExportStatePort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get<{
      Params: FmsSessionExportStateParams;
    }>(
      "/api/auction-sessions/:id/fms-export-state",
      async (request, reply) => {
        try {
          const state =
            service.getStatus(
              request.params.id
            );

          return reply.code(200).send({
            data: state,
            error: null
          });
        } catch (error) {
          const mapped =
            mapFmsSessionExportStateError(
              error
            );

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
      Params: FmsSessionExportStateParams;
    }>(
      "/api/auction-sessions/:id/fms-export-state/confirm",
      async (request, reply) => {
        try {
          const state =
            service.confirm(
              request.params.id
            );

          return reply.code(200).send({
            data: state,
            error: null
          });
        } catch (error) {
          const mapped =
            mapFmsSessionExportStateError(
              error
            );

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
}
