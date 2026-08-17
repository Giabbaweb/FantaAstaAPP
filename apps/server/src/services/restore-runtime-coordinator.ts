import type {
  PreparedRecoveryPointRestore
} from "./recovery-point-restore.service.js";

export type RestoreRuntimeWake =
  () => void;

type RestoreRuntimeState =
  | "IDLE"
  | "PREPARING"
  | "SCHEDULED";

export class RestoreAlreadyScheduledError
  extends Error {
  constructor() {
    super(
      "A recovery point restore is already scheduled"
    );

    this.name =
      "RestoreAlreadyScheduledError";
  }
}

export class RestoreRuntimeCoordinator {
  private state:
    RestoreRuntimeState =
      "IDLE";

  private scheduled:
    PreparedRecoveryPointRestore | null =
      null;

  private responseFlushed =
    false;

  constructor(
    private readonly wake:
      RestoreRuntimeWake = () => {}
  ) {}

  async prepareAndSchedule(
    prepare:
      () =>
        Promise<
          PreparedRecoveryPointRestore
        >
  ): Promise<
    PreparedRecoveryPointRestore
  > {
    if (this.state !== "IDLE") {
      throw new RestoreAlreadyScheduledError();
    }

    /*
     * Reserve the restore before the first await.
     * This prevents concurrent preparations from
     * writing the same restore candidate.
     */
    this.state =
      "PREPARING";

    this.responseFlushed =
      false;

    try {
      const prepared =
        await prepare();

      this.scheduled =
        prepared;

      this.state =
        "SCHEDULED";

      return prepared;
    } catch (error) {
      this.state =
        "IDLE";

      this.scheduled =
        null;

      this.responseFlushed =
        false;

      throw error;
    }
  }

  markResponseFlushed(): void {
    if (
      this.state !== "SCHEDULED" ||
      this.scheduled === null ||
      this.responseFlushed
    ) {
      return;
    }

    this.responseFlushed =
      true;

    try {
      this.wake();
    } catch (error) {
      this.responseFlushed =
        false;

      throw error;
    }
  }

  peekScheduled():
    PreparedRecoveryPointRestore | null {
    return this.scheduled;
  }

  takeScheduled():
    PreparedRecoveryPointRestore | null {
    if (
      this.state !== "SCHEDULED" ||
      !this.responseFlushed
    ) {
      return null;
    }

    const scheduled =
      this.scheduled;

    this.state =
      "IDLE";

    this.scheduled =
      null;

    this.responseFlushed =
      false;

    return scheduled;
  }
}
