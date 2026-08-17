import {
  createManualBackupCommandSchema
} from "@fantaastaapp/contracts";
import type {
  CreateManualBackupCommand
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import type {
  ManualBackupService
} from "../services/manual-backup.service.js";

type ManualBackupParams = {
  id: string;
};

type ManualBackupBody =
  CreateManualBackupCommand;

type ManualBackupServicePort = Pick<
  ManualBackupService,
  "create"
>;

function mapManualBackupError(
  error: unknown
): {
  statusCode: 404 | 500;
  body: {
    data: null;
    error: {
      code: string;
      message: string;
    };
  };
} {
  if (
    error instanceof Error &&
    error.message.startsWith(
      "Auction session not found for backup:"
    )
  ) {
    return {
      statusCode: 404,
      body: {
        data: null,
        error: {
          code:
            "AUCTION_SESSION_NOT_FOUND",
          message:
            "Auction session not found"
        }
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      data: null,
      error: {
        code:
          "MANUAL_BACKUP_FAILED",
        message:
          "Manual backup failed"
      }
    }
  };
}

export function manualBackupRoutes(
  manualBackupService:
    ManualBackupServicePort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post<{
      Params: ManualBackupParams;
      Body: ManualBackupBody;
    }>(
      "/api/auction-sessions/:id/backups/manual",
      async (request, reply) => {
        const validation =
          createManualBackupCommandSchema
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
          const backup =
            await manualBackupService
              .create(
                request.params.id,
                validation.data.actor
              );

          return reply.code(200).send({
            data: backup,
            error: null
          });
        } catch (error) {
          fastify.log.error(
            {
              module: "backup",
              auctionSessionId:
                request.params.id,
              backupType:
                "MANUAL_BACKUP",
              error
            },
            "Manual backup failed"
          );

          const mapped =
            mapManualBackupError(
              error
            );

          return reply
            .code(mapped.statusCode)
            .send(mapped.body);
        }
      }
    );
  };
}
