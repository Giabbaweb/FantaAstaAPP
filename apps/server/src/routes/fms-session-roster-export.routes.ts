import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapFmsSessionRosterExportError
} from "../http/fms-session-roster-export-errors.js";
import type {
  FmsRosterExportErrorResponse
} from "../http/fms-roster-export-errors.js";
import type {
  FmsSessionRosterExportFile,
  FmsSessionRosterExportService
} from "../services/fms-session-roster-export.service.js";

type FmsSessionRosterExportParams = {
  id: string;
};

type FmsSessionRosterExportResponse = {
  data: FmsSessionRosterExportFile[];
  error: null;
};

type FmsSessionRosterExportPort = Pick<
  FmsSessionRosterExportService,
  "execute"
>;

export function fmsSessionRosterExportRoutes(
  exportService: FmsSessionRosterExportPort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get<{
      Params: FmsSessionRosterExportParams;
      Reply:
        | FmsSessionRosterExportResponse
        | FmsRosterExportErrorResponse;
    }>(
      "/api/auction-sessions/:id/fms-roster-export",
      async (request, reply) => {
        try {
          const files =
            await exportService.execute(
              request.params.id
            );

          return reply.code(200).send({
            data: files,
            error: null
          });
        } catch (error) {
          const mapped =
            mapFmsSessionRosterExportError(
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
