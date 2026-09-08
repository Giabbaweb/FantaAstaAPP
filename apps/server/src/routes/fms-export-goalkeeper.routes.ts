import {
  fmsExportGoalkeeperSelectionSchema
} from "@fantaastaapp/contracts";
import type {
  FmsExportGoalkeeperSelectionInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapFmsExportGoalkeeperSelectionError
} from "../http/fms-export-goalkeeper-selection-errors.js";
import type {
  FmsExportGoalkeeperSelectionService
} from "../services/fms-export-goalkeeper-selection.service.js";

type FmsExportGoalkeeperParams = {
  id: string;
};

type FmsExportGoalkeeperBody =
  FmsExportGoalkeeperSelectionInput;

type FmsExportGoalkeeperSelectionPort = Pick<
  FmsExportGoalkeeperSelectionService,
  | "getSelected"
  | "select"
>;

export function fmsExportGoalkeeperRoutes(
  selectionService:
    FmsExportGoalkeeperSelectionPort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get<{
      Params: FmsExportGoalkeeperParams;
    }>(
      "/api/auction-session-teams/:id/fms-export-goalkeeper",
      async (request, reply) => {
        try {
          const selection =
            selectionService.getSelected(
              request.params.id
            );

          return reply.code(200).send({
            data: selection,
            error: null
          });
        } catch (error) {
          const mapped =
            mapFmsExportGoalkeeperSelectionError(
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

    fastify.put<{
      Params: FmsExportGoalkeeperParams;
      Body: FmsExportGoalkeeperBody;
    }>(
      "/api/auction-session-teams/:id/fms-export-goalkeeper",
      async (request, reply) => {
        const validation =
          fmsExportGoalkeeperSelectionSchema
            .safeParse(
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
          const selection =
            selectionService.select(
              request.params.id,
              validation.data.playerId
            );

          return reply.code(200).send({
            data: selection,
            error: null
          });
        } catch (error) {
          const mapped =
            mapFmsExportGoalkeeperSelectionError(
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
