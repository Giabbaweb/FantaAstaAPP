import {
  mkdir
} from "node:fs/promises";
import path from "node:path";

import pino from "pino";

export const backupRecoveryTechnicalEvents = [
  "BACKUP_STARTED",
  "BACKUP_COMPLETED",
  "BACKUP_FAILED",
  "RESTORE_REQUESTED",
  "RESTORE_VALIDATION_STARTED",
  "PRE_RESTORE_BACKUP_COMPLETED",
  "RESTORE_REPLACEMENT_STARTED",
  "RESTORE_COMPLETED",
  "RESTORE_FAILED",
  "STARTUP_RECOVERY"
] as const;

export type BackupRecoveryTechnicalEvent =
  typeof backupRecoveryTechnicalEvents[number];

export type BackupRecoveryTechnicalLogEntry = {
  event:
    BackupRecoveryTechnicalEvent;

  auctionSessionId?: string;
  leagueId?: string;
  reason?: string;
  fileName?: string;

  sizeBytes?: number;
  durationMs?: number;

  integrity?: string;

  error?: {
    name?: string;
    message: string;
    code?: string;
  };

  details?: Record<
    string,
    unknown
  >;
};

export type BackupRecoveryTechnicalLoggerOptions = {
  logsRoot: string;
  fileName?: string;
};

function serializeError(
  error: unknown
): BackupRecoveryTechnicalLogEntry["error"] {
  if (error instanceof Error) {
    const value: {
      name?: string;
      message: string;
      code?: string;
    } = {
      name:
        error.name,
      message:
        error.message
    };

    if (
      "code" in error &&
      typeof error.code === "string"
    ) {
      value.code =
        error.code;
    }

    return value;
  }

  return {
    message:
      String(error)
  };
}

export class BackupRecoveryTechnicalLogger {
  private readonly logger:
    pino.Logger;

  readonly logPath: string;

  private constructor(
    logger: pino.Logger,
    logPath: string
  ) {
    this.logger =
      logger;

    this.logPath =
      logPath;
  }

  static async create(
    options:
      BackupRecoveryTechnicalLoggerOptions
  ): Promise<
    BackupRecoveryTechnicalLogger
  > {
    await mkdir(
      options.logsRoot,
      {
        recursive: true
      }
    );

    const logPath =
      path.join(
        options.logsRoot,
        options.fileName ??
          "backup-recovery.log"
      );

    const destination =
      pino.destination({
        dest:
          logPath,
        sync:
          true,
        mkdir:
          true
      });

    const logger =
      pino(
        {
          base: {
            module:
              "backup-recovery"
          },
          timestamp:
            pino.stdTimeFunctions
              .isoTime
        },
        destination
      );

    return new BackupRecoveryTechnicalLogger(
      logger,
      logPath
    );
  }

  info(
    entry:
      BackupRecoveryTechnicalLogEntry
  ): void {
    this.logger.info(entry);
  }

  error(
    entry:
      Omit<
        BackupRecoveryTechnicalLogEntry,
        "error"
      > & {
        error: unknown;
      }
  ): void {
    const {
      error,
      ...rest
    } = entry;

    this.logger.error({
      ...rest,
      error:
        serializeError(
          error
        )
    });
  }

  flush(): void {
    this.logger.flush();
  }
}
