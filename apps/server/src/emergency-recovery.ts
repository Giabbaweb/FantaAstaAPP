import "dotenv/config";

import {
  createInterface
} from "node:readline/promises";
import {
  stdin as input,
  stdout as output
} from "node:process";
import path from "node:path";
import {
  fileURLToPath
} from "node:url";

import {
  BackupRecoveryTechnicalLogger
} from "./services/backup-recovery-technical-logger.js";
import {
  EmergencyRecoveryPreparationService
} from "./services/emergency-recovery-preparation.service.js";
import {
  EmergencyRecoverySwapService
} from "./services/emergency-recovery-swap.service.js";

const currentDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const workspaceRoot =
  path.resolve(
    currentDirectory,
    "../../../.."
  );

const configuredDatabasePath =
  process.env.SQLITE_DATABASE_PATH ??
  "data/database/fantaasta.sqlite";

const databasePath =
  path.isAbsolute(
    configuredDatabasePath
  )
    ? configuredDatabasePath
    : path.resolve(
        workspaceRoot,
        configuredDatabasePath
      );

const configuredBackupRoot =
  process.env.BACKUP_ROOT ??
  "backups";

const backupRoot =
  path.isAbsolute(
    configuredBackupRoot
  )
    ? configuredBackupRoot
    : path.resolve(
        workspaceRoot,
        configuredBackupRoot
      );

const configuredLogsRoot =
  process.env.LOGS_ROOT ??
  "logs";

const logsRoot =
  path.isAbsolute(
    configuredLogsRoot
  )
    ? configuredLogsRoot
    : path.resolve(
        workspaceRoot,
        configuredLogsRoot
      );

function usage(): never {
  console.error(
    [
      "",
      "Emergency Recovery",
      "",
      "Usage:",
      "  pnpm --filter @fantaastaapp/server emergency-recovery -- <backup.sqlite>",
      "",
      "The recovery point must be selected explicitly.",
      ""
    ].join("\n")
  );

  process.exit(2);
}

async function main():
  Promise<void> {
  const argumentsAfterSeparator =
    process.argv
      .slice(2)
      .filter(
        (argument) =>
          argument !== "--"
      );

  if (
    argumentsAfterSeparator.length !== 1
  ) {
    usage();
  }

  const [fileName] =
    argumentsAfterSeparator;

  if (!fileName) {
    usage();
  }

  const technicalLogger =
    await BackupRecoveryTechnicalLogger
      .create({
        logsRoot
      });

  technicalLogger.info({
    event:
      "RESTORE_REQUESTED",
    fileName,
    details: {
      mode:
        "EMERGENCY_RECOVERY"
    }
  });

  try {
    technicalLogger.info({
      event:
        "RESTORE_VALIDATION_STARTED",
      fileName,
      details: {
        mode:
          "EMERGENCY_RECOVERY"
      }
    });

    const preparationService =
      new EmergencyRecoveryPreparationService({
        backupRoot,
        databasePath
      });

    const prepared =
      await preparationService
        .prepare({
          fileName
        });

  console.log("");
  console.log(
    "=== EMERGENCY RECOVERY ==="
  );
  console.log(
    `Recovery point : ${prepared.fileName}`
  );
  console.log(
    `Session        : ${prepared.auctionSessionId}`
  );
  console.log(
    `League         : ${prepared.leagueId}`
  );
  console.log(
    `Source         : ${prepared.sourcePath}`
  );
  console.log(
    `Target DB      : ${databasePath}`
  );
  console.log("");
  console.log(
    "The current database, WAL and SHM files will be preserved when present."
  );
  console.log(
    "No recovery point has been selected automatically."
  );
  console.log("");

  const readline =
    createInterface({
      input,
      output
    });

  try {
    const confirmation =
      await readline.question(
        'Type "RESTORE" to continue: '
      );

    if (
      confirmation !==
        "RESTORE"
    ) {
      console.log(
        "Emergency Recovery cancelled."
      );

      process.exitCode = 1;
      return;
    }
  } finally {
    readline.close();
  }

  technicalLogger.info({
    event:
      "RESTORE_REPLACEMENT_STARTED",
    auctionSessionId:
      prepared.auctionSessionId,
    leagueId:
      prepared.leagueId,
    fileName:
      prepared.fileName,
    details: {
      mode:
        "EMERGENCY_RECOVERY"
    }
  });

  const swapService =
    new EmergencyRecoverySwapService();

  const result =
    await swapService.commitSwap({
      databasePath,
      candidatePath:
        prepared.candidatePath
    });

  console.log("");
  console.log(
    "EMERGENCY RECOVERY COMPLETED"
  );
  console.log(
    `Database restored : ${result.databasePath}`
  );

  if (
    result.preservedDatabasePath
  ) {
    console.log(
      `Preserved DB      : ${result.preservedDatabasePath}`
    );
  }

  if (
    result.preservedWalPath
  ) {
    console.log(
      `Preserved WAL     : ${result.preservedWalPath}`
    );
  }

  if (
    result.preservedShmPath
  ) {
    console.log(
      `Preserved SHM     : ${result.preservedShmPath}`
    );
  }

  technicalLogger.info({
    event:
      "RESTORE_COMPLETED",
    auctionSessionId:
      prepared.auctionSessionId,
    leagueId:
      prepared.leagueId,
    fileName:
      prepared.fileName,
    details: {
      mode:
        "EMERGENCY_RECOVERY",
      preservedDatabasePath:
        result.preservedDatabasePath,
      preservedWalPath:
        result.preservedWalPath,
      preservedShmPath:
        result.preservedShmPath
    }
  });

  technicalLogger.flush();

  console.log("");
  console.log(
    "Restart FantaAstaAPP normally."
  );
  } catch (error) {
    technicalLogger.error({
      event:
        "RESTORE_FAILED",
      fileName,
      error,
      details: {
        mode:
          "EMERGENCY_RECOVERY"
      }
    });

    technicalLogger.flush();

    throw error;
  }
}

main().catch((error) => {
  console.error("");
  console.error(
    "EMERGENCY RECOVERY FAILED"
  );

  if (
    error instanceof Error
  ) {
    console.error(
      `${error.name}: ${error.message}`
    );
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
