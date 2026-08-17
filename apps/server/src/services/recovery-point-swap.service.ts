import {
  access,
  rename,
  rm
} from "node:fs/promises";

export type RecoveryPointSwapInput = {
  databasePath: string;
  candidatePath: string;
};

export type RecoveryPointSwapResult = {
  databasePath: string;
};

export class RecoveryPointSwapError
  extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name =
      "RecoveryPointSwapError";
  }
}

async function exists(
  filePath: string
): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export class RecoveryPointSwapService {
  async commitSwap(
    input: RecoveryPointSwapInput
  ): Promise<RecoveryPointSwapResult> {
    const {
      databasePath,
      candidatePath
    } = input;

    if (
      !(await exists(candidatePath))
    ) {
      throw new RecoveryPointSwapError(
        "RESTORE_CANDIDATE_NOT_FOUND",
        "Restore candidate not found"
      );
    }

    const previousPath =
      `${databasePath}.pre-swap`;

    await rm(
      previousPath,
      {
        force: true
      }
    );

    /*
     * The live connection must already be closed
     * before this service is invoked.
     */
    await rm(
      `${databasePath}-wal`,
      {
        force: true
      }
    );

    await rm(
      `${databasePath}-shm`,
      {
        force: true
      }
    );

    const liveExists =
      await exists(databasePath);

    try {
      if (liveExists) {
        await rename(
          databasePath,
          previousPath
        );
      }

      await rename(
        candidatePath,
        databasePath
      );

      await rm(
        previousPath,
        {
          force: true
        }
      );

      return {
        databasePath
      };
    } catch (error) {
      /*
       * Best-effort rollback of the filesystem swap.
       */
      try {
        if (
          await exists(previousPath)
        ) {
          await rm(
            databasePath,
            {
              force: true
            }
          );

          await rename(
            previousPath,
            databasePath
          );
        }
      } catch {
        // Preserve the original failure.
      }

      throw new RecoveryPointSwapError(
        "RESTORE_SWAP_FAILED",
        error instanceof Error
          ? error.message
          : "Recovery point swap failed"
      );
    }
  }
}
