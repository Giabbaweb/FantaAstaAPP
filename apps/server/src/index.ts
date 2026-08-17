import "dotenv/config";

import {
  buildApp
} from "./app.js";

import {
  databasePath
} from "./db/client.js";

import {
  RecoveryPointSwapService
} from "./services/recovery-point-swap.service.js";

import {
  RestoreProcessBoundary
} from "./services/restore-process-boundary.js";

import {
  RestoreRuntimeCoordinator
} from "./services/restore-runtime-coordinator.js";

import {
  RestoreRuntimeExecutor
} from "./services/restore-runtime-executor.js";

import {
  StartupRecoveryService
} from "./services/startup-recovery.service.js";

const host =
  process.env.HOST ?? "0.0.0.0";

const port =
  Number(process.env.PORT ?? 3001);

if (
  !Number.isInteger(port) ||
  port <= 0
) {
  throw new Error(
    `PORT non valida: ${process.env.PORT ?? ""}`
  );
}

/*
 * The coordinator must be shared between
 * the HTTP restore route and the outer
 * process runtime.
 *
 * The boundary is assigned after buildApp()
 * because its executor needs app.close().
 */
let restoreProcessBoundary:
  RestoreProcessBoundary | null =
    null;

const restoreRuntimeCoordinator =
  new RestoreRuntimeCoordinator(
    () => {
      restoreProcessBoundary
        ?.wake();
    }
  );

const app =
  await buildApp({
    restoreRuntimeCoordinator
  });

const restoreRuntimeExecutor =
  new RestoreRuntimeExecutor({
    coordinator:
      restoreRuntimeCoordinator,

    closeApplication:
      async () => {
        await app.close();
      },

    swapService:
      new RecoveryPointSwapService(),

    databasePath
  });

restoreProcessBoundary =
  new RestoreProcessBoundary({
    executor:
      restoreRuntimeExecutor,

    exit:
      (code) => {
        process.exit(code);
      },

    logger: {
      info:
        (
          details,
          message
        ) => {
          app.log.info(
            details,
            message
          );
        },

      error:
        (
          details,
          message
        ) => {
          app.log.error(
            details,
            message
          );
        }
    }
  });

const start =
  async (): Promise<void> => {
    try {
      const startupRecoveryService =
        new StartupRecoveryService();

      const recoveryResult =
        await startupRecoveryService
          .run();

      for (
        const recovered of
        recoveryResult.recoveredSessions
      ) {
        if (
          recovered.backupSucceeded
        ) {
          app.log.info(
            {
              auctionSessionId:
                recovered.auctionSessionId,

              previousStateVersion:
                recovered
                  .previousStateVersion,

              recoveredStateVersion:
                recovered
                  .recoveredStateVersion,

              operation:
                "startup-recovery"
            },
            "RUNNING auction session suspended after restart"
          );
        } else {
          app.log.error(
            {
              auctionSessionId:
                recovered.auctionSessionId,

              previousStateVersion:
                recovered
                  .previousStateVersion,

              recoveredStateVersion:
                recovered
                  .recoveredStateVersion,

              error:
                recovered.backupError,

              operation:
                "startup-recovery-backup"
            },
            "Startup recovery completed but recovery-point creation failed"
          );
        }
      }

      await app.listen({
        host,
        port
      });
    } catch (error) {
      app.log.error(error);

      process.exit(1);
    }
  };

await start();
