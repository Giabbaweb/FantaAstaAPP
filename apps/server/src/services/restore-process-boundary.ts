import type {
  RestoreRuntimeExecutor
} from "./restore-runtime-executor.js";

type RestoreRuntimeExecutorPort = Pick<
  RestoreRuntimeExecutor,
  "executeScheduledRestore"
>;

export type RestoreProcessExit =
  (code: number) => void;

export type RestoreProcessLogger = {
  info:
    (
      details: Record<string, unknown>,
      message: string
    ) => void;
  error:
    (
      details: Record<string, unknown>,
      message: string
    ) => void;
};

export type RestoreProcessBoundaryOptions = {
  executor:
    RestoreRuntimeExecutorPort;
  exit:
    RestoreProcessExit;
  logger:
    RestoreProcessLogger;
};

export class RestoreProcessBoundary {
  private readonly executor:
    RestoreRuntimeExecutorPort;

  private readonly exit:
    RestoreProcessExit;

  private readonly logger:
    RestoreProcessLogger;

  private running =
    false;

  constructor(
    options:
      RestoreProcessBoundaryOptions
  ) {
    this.executor =
      options.executor;

    this.exit =
      options.exit;

    this.logger =
      options.logger;
  }

  wake(): void {
    if (this.running) {
      return;
    }

    this.running =
      true;

    void this.run();
  }

  private async run():
    Promise<void> {
    try {
      const result =
        await this.executor
          .executeScheduledRestore();

      if (!result.executed) {
        this.running =
          false;

        return;
      }

      this.logger.info(
        {
          auctionSessionId:
            result.auctionSessionId,
          backupFileName:
            result.fileName,
          databasePath:
            result.databasePath,
          operation:
            "recovery-point-restore"
        },
        "Recovery point restored; process restart required"
      );

      this.exit(0);
    } catch (error) {
      this.logger.error(
        {
          error,
          operation:
            "recovery-point-restore"
        },
        "Recovery point restore failed after runtime wake"
      );

      this.exit(1);
    }
  }
}
