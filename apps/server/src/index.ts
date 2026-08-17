import "dotenv/config";

import {
  buildApp
} from "./app.js";

import {
  StartupRecoveryService
} from "./services/startup-recovery.service.js";

const host =
  process.env.HOST ?? "0.0.0.0";

const port =
  Number(process.env.PORT ?? 3001);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(
    `PORT non valida: ${process.env.PORT ?? ""}`
  );
}

const app =
  await buildApp();

const start = async (): Promise<void> => {
  try {
    const startupRecoveryService =
      new StartupRecoveryService();

    const recoveryResult =
      await startupRecoveryService.run();

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
              recovered.previousStateVersion,
            recoveredStateVersion:
              recovered.recoveredStateVersion,
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
              recovered.previousStateVersion,
            recoveredStateVersion:
              recovered.recoveredStateVersion,
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
