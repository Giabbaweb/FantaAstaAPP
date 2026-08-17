import {
  deleteRecoveryPointCommandSchema
} from "@fantaastaapp/contracts";
import type {
  DeleteRecoveryPointCommand
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  RecoveryPointNotFoundError
} from "../services/recovery-point-deletion.service.js";
import type {
  RecoveryPointDeletionService
} from "../services/recovery-point-deletion.service.js";

type RecoveryPointDeletionParams = {
  id: string;
  fileName: string;
};

type RecoveryPointDeletionBody =
  DeleteRecoveryPointCommand;

type RecoveryPointDeletionPort = Pick<
  RecoveryPointDeletionService,
  "deleteRecoveryPoint"
>;

export function recoveryPointDeletionRoutes(
  deletionService:
    RecoveryPointDeletionPort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.delete<{
      Params:
        RecoveryPointDeletionParams;
      Body:
        RecoveryPointDeletionBody;
    }>(
      "/api/auction-sessions/:id/backups/:fileName",
      async (request, reply) => {
        const validation =
          deleteRecoveryPointCommandSchema
            .safeParse(
              request.body
            );

        if (!validation.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code:
                "INVALID_REQUEST",
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
          const result =
            await deletionService
              .deleteRecoveryPoint({
                auctionSessionId:
                  request.params.id,
                fileName:
                  request.params.fileName
              });

          fastify.log.info(
            {
              module: "backup",
              auctionSessionId:
                request.params.id,
              backupFileName:
                result.fileName,
              actor:
                validation.data.actor
            },
            "Recovery point deleted"
          );

          return reply.code(200).send({
            data: result,
            error: null
          });
        } catch (error) {
          if (
            error instanceof
            RecoveryPointNotFoundError
          ) {
            return reply.code(404).send({
              data: null,
              error: {
                code:
                  "RECOVERY_POINT_NOT_FOUND",
                message:
                  "Recovery point not found"
              }
            });
          }

          fastify.log.error(
            {
              module: "backup",
              auctionSessionId:
                request.params.id,
              backupFileName:
                request.params.fileName,
              error
            },
            "Recovery point deletion failed"
          );

          return reply.code(500).send({
            data: null,
            error: {
              code:
                "RECOVERY_POINT_DELETE_FAILED",
              message:
                "Recovery point could not be deleted"
            }
          });
        }
      }
    );
  };
}
