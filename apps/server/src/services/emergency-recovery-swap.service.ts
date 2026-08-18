import {
  access,
  rename
} from "node:fs/promises";

export type EmergencyRecoverySwapInput = {
  databasePath: string;
  candidatePath: string;
};

export type EmergencyRecoverySwapResult = {
  databasePath: string;
  preservedDatabasePath: string | null;
  preservedWalPath: string | null;
  preservedShmPath: string | null;
};

export type EmergencyRecoverySwapServiceOptions = {
  now?: () => Date;
};

export class EmergencyRecoverySwapError
  extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name =
      "EmergencyRecoverySwapError";
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

function timestampSlug(
  value: Date
): string {
  return value
    .toISOString()
    .replace("T", "_")
    .replace(/[:.]/g, "-");
}

export class EmergencyRecoverySwapService {
  private readonly now:
    () => Date;

  constructor(
    options:
      EmergencyRecoverySwapServiceOptions = {}
  ) {
    this.now =
      options.now ??
      (() => new Date());
  }

  async commitSwap(
    input:
      EmergencyRecoverySwapInput
  ): Promise<
    EmergencyRecoverySwapResult
  > {
    if (
      !(await exists(
        input.candidatePath
      ))
    ) {
      throw new EmergencyRecoverySwapError(
        "EMERGENCY_RESTORE_CANDIDATE_NOT_FOUND",
        "Emergency restore candidate not found"
      );
    }

    const suffix =
      `.emergency-damaged-${timestampSlug(
        this.now()
      )}`;

    const preservedDatabasePath =
      await this.preserveIfPresent(
        input.databasePath,
        `${input.databasePath}${suffix}`
      );

    const preservedWalPath =
      await this.preserveIfPresent(
        `${input.databasePath}-wal`,
        `${input.databasePath}-wal${suffix}`
      );

    const preservedShmPath =
      await this.preserveIfPresent(
        `${input.databasePath}-shm`,
        `${input.databasePath}-shm${suffix}`
      );

    try {
      await rename(
        input.candidatePath,
        input.databasePath
      );
    } catch (error) {
      await this.rollbackPreserved(
        input.databasePath,
        preservedDatabasePath,
        preservedWalPath,
        preservedShmPath
      );

      throw new EmergencyRecoverySwapError(
        "EMERGENCY_RESTORE_SWAP_FAILED",
        error instanceof Error
          ? error.message
          : "Emergency recovery swap failed"
      );
    }

    return {
      databasePath:
        input.databasePath,
      preservedDatabasePath,
      preservedWalPath,
      preservedShmPath
    };
  }

  private async preserveIfPresent(
    sourcePath: string,
    destinationPath: string
  ): Promise<string | null> {
    if (
      !(await exists(sourcePath))
    ) {
      return null;
    }

    await rename(
      sourcePath,
      destinationPath
    );

    return destinationPath;
  }

  private async rollbackPreserved(
    databasePath: string,
    preservedDatabasePath:
      string | null,
    preservedWalPath:
      string | null,
    preservedShmPath:
      string | null
  ): Promise<void> {
    try {
      if (
        preservedDatabasePath &&
        !(await exists(databasePath))
      ) {
        await rename(
          preservedDatabasePath,
          databasePath
        );
      }

      if (preservedWalPath) {
        await rename(
          preservedWalPath,
          `${databasePath}-wal`
        );
      }

      if (preservedShmPath) {
        await rename(
          preservedShmPath,
          `${databasePath}-shm`
        );
      }
    } catch {
      /*
       * Preserve the original emergency
       * swap failure.
       */
    }
  }
}
