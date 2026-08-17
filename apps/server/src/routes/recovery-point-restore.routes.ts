import {
  restoreRecoveryPointCommandSchema
} from "@fantaastaapp/contracts";
import type {
  RestoreRecoveryPointCommand
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  RecoveryPointRestoreError
} from "../services/recovery-point-restore.service.js";
import type {
  RecoveryPointRestoreService
} from "../services/recovery-point-restore.service.js";
import {
  RestoreAlreadyScheduledError
} from "../services/restore-runtime-coordinator.js";
import type {
  RestoreRuntimeCoordinator
} from "../services/restore-runtime-coordinator.js";

type RestoreParams = {
  id: string;
  fileName: string;
};

type RestoreBody =
  RestoreRecoveryPointCommand;

type RestoreServicePort = Pick<
  RecoveryPointRestoreService,
  "prepareRestore"
>;

type RestoreRuntimePort = Pick<
  RestoreRuntimeCoordinator,
  | "prepareAndSchedule"
  | "markResponseFlushed"
>;

function mapRestoreError(
  error: unknown
): {
  statusCode:
    | 404
    | 409
    | 500;
  code: string;
  message: string;
} {
  if (
    error instanceof
    RestoreAlreadyScheduledError
  ) {
    return {
      statusCode: 409,
      code:
        "RESTORE_ALREADY_SCHEDULED",
      message:
        "A recovery point restore is already scheduled"
    };
  }

  if (
    error instanceof
    RecoveryPointRestoreError
  ) {
    switch (error.code) {
      case "RECOVERY_POINT_NOT_FOUND":
      case "AUCTION_SESSION_NOT_FOUND":
        return {
          statusCode: 404,
          code: error.code,
          message: error.message
        };

      case "AUCTION_SESSION_NOT_SUSPENDED":
      case "RECOVERY_POINT_INVALID":
      case "RECOVERY_POINT_INCOMPATIBLE":
        return {
          statusCode: 409,
          code: error.code,
          message: error.message
        };

      default:
        return {
          statusCode: 500,
          code:
            "RECOVERY_POINT_RESTORE_FAILED",
          message:
            "Recovery point restore could not be prepared"
        };
    }
  }

  return {
    statusCode: 500,
    code:
      "RECOVERY_POINT_RESTORE_FAILED",
    message:
      "Recovery point restore could not be prepared"
  };
}

export function recoveryPointRestoreRoutes(
  restoreService:
    RestoreServicePort,
  restoreRuntime:
    RestoreRuntimePort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post<{
      Params: RestoreParams;
      Body: RestoreBody;
    }>(
      "/api/auction-sessions/:id/backups/:fileName/restore",
      async (request, reply) => {
        const validation =
          restoreRecoveryPointCommandSchema
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
          const prepared =
            await restoreRuntime
              .prepareAndSchedule(
                () =>
                  restoreService
                    .prepareRestore({
                      auctionSessionId:
                        request.params.id,
                      fileName:
                        request.params.fileName
                    })
              );

          reply.raw.once(
            "finish",
            () => {
              try {
                restoreRuntime
                  .markResponseFlushed();
              } catch (error) {
                fastify.log.error(
                  {
                    module: "recovery",
                    auctionSessionId:
                      request.params.id,
                    backupFileName:
                      request.params.fileName,
                    error
                  },
                  "Restore runtime wake failed after response flush"
                );
              }
            }
          );

          return reply.code(200).send({
            data: {
              status:
                "RESTORE_PREPARED",
              auctionSessionId:
                prepared.auctionSessionId,
              fileName:
                prepared.fileName,
              restartRequired: true
            },
            error: null
          });
        } catch (error) {
          const mapped =
            mapRestoreError(error);

          fastify.log.error(
            {
              module: "recovery",
              auctionSessionId:
                request.params.id,
              backupFileName:
                request.params.fileName,
              error
            },
            "Recovery point restore preparation failed"
          );

          return reply
            .code(mapped.statusCode)
            .send({
              data: null,
              error: {
                code:
                  mapped.code,
                message:
                  mapped.message
              }
            });
        }
      }
    );
  };
}
