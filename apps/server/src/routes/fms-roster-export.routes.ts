import type {
  FastifyPluginAsync
} from "fastify";

import {
  buildFmsRosterFilename
} from "../export/fms-roster-filename.js";

import {
  mapFmsRosterExportError
} from "../http/fms-roster-export-errors.js";
import type {
  TeamRepository
} from "../repositories/team.repository.js";
import type {
  FmsRosterExportService
} from "../services/fms-roster-export.service.js";

type FmsRosterExportParams = {
  id: string;
};

type FmsRosterExportServicePort = Pick<
  FmsRosterExportService,
  "executeFile"
>;

type TeamLookupPort = Pick<
  TeamRepository,
  "findById"
>;

export function fmsRosterExportRoutes(
  exportService: FmsRosterExportServicePort,
  teamRepository: TeamLookupPort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get<{
      Params: FmsRosterExportParams;
    }>(
      "/api/auction-session-teams/:id/fms-roster-export",
      async (request, reply) => {
        try {
          const {
            content,
            teamId
          } = exportService.executeFile(
            request.params.id
          );

          const team =
            await teamRepository.findById(
              teamId
            );

          if (!team) {
            return reply.code(404).send({
              data: null,
              error: {
                code: "TEAM_NOT_FOUND",
                message:
                  `Team "${teamId}" was not found`
              }
            });
          }

          const filename =
            buildFmsRosterFilename(
              team.name
            );

          return reply
            .header(
              "Content-Type",
              "text/plain; charset=utf-8"
            )
            .header(
              "Content-Disposition",
              `attachment; filename="${filename}"`
            )
            .code(200)
            .send(content);
        } catch (error) {
          const mapped =
            mapFmsRosterExportError(error);

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
