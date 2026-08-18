import type {
  BackupRecoveryTechnicalLogger
} from "./backup-recovery-technical-logger.js";
import type {
  RecoveryPointSwapService
} from "./recovery-point-swap.service.js";
import type {
  RestoreRuntimeCoordinator
} from "./restore-runtime-coordinator.js";

type RestoreRuntimeCoordinatorPort = Pick<
  RestoreRuntimeCoordinator,
  "takeScheduled"
>;

type RecoveryPointSwapPort = Pick<
  RecoveryPointSwapService,
  "commitSwap"
>;

export type RestoreApplicationCloser =
  () => Promise<void>;

type BackupRecoveryTechnicalLoggerPort =
  Pick<
    BackupRecoveryTechnicalLogger,
    "info"
  >;

export type RestoreRuntimeExecutorOptions = {
  coordinator:
    RestoreRuntimeCoordinatorPort;
  closeApplication:
    RestoreApplicationCloser;
  swapService:
    RecoveryPointSwapPort;
  databasePath: string;
  technicalLogger?:
    BackupRecoveryTechnicalLoggerPort;
};

export type RestoreRuntimeExecutionResult =
  | {
      executed: false;
    }
  | {
      executed: true;
      auctionSessionId: string;
      fileName: string;
      databasePath: string;
    };

export class RestoreRuntimeExecutor {
  private readonly coordinator:
    RestoreRuntimeCoordinatorPort;

  private readonly closeApplication:
    RestoreApplicationCloser;

  private readonly swapService:
    RecoveryPointSwapPort;

  private readonly databasePath:
    string;

  private readonly technicalLogger:
    BackupRecoveryTechnicalLoggerPort | undefined;

  private executionStarted =
    false;

  constructor(
    options:
      RestoreRuntimeExecutorOptions
  ) {
    this.coordinator =
      options.coordinator;

    this.closeApplication =
      options.closeApplication;

    this.swapService =
      options.swapService;

    this.databasePath =
      options.databasePath;

    this.technicalLogger =
      options.technicalLogger;
  }

  async executeScheduledRestore():
    Promise<
      RestoreRuntimeExecutionResult
    > {
    if (this.executionStarted) {
      return {
        executed: false
      };
    }

    const prepared =
      this.coordinator
        .takeScheduled();

    if (!prepared) {
      return {
        executed: false
      };
    }

    /*
     * From this point onward the operation is
     * intentionally one-shot. The application
     * is about to shut down and the process will
     * be terminated by the outer runtime boundary.
     */
    this.executionStarted =
      true;

    await this.closeApplication();

    this.technicalLogger?.info({
      event:
        "RESTORE_REPLACEMENT_STARTED",
      auctionSessionId:
        prepared.auctionSessionId,
      fileName:
        prepared.fileName
    });

    const swapResult =
      await this.swapService
        .commitSwap({
          databasePath:
            this.databasePath,
          candidatePath:
            prepared.candidatePath
        });

    return {
      executed: true,
      auctionSessionId:
        prepared.auctionSessionId,
      fileName:
        prepared.fileName,
      databasePath:
        swapResult.databasePath
    };
  }
}
