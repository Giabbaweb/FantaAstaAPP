import {
  copyFile,
  readFile,
  readdir,
  rm
} from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

import type {
  BackupRecoveryTechnicalLogger
} from "./backup-recovery-technical-logger.js";

import type {
  CreateRecoveryPointInput
} from "./sqlite-recovery-point.service.js";

type RecoveryPointCreator = {
  createRecoveryPoint(
    input: CreateRecoveryPointInput
  ): Promise<unknown>;
};

type MigrationIdentity = {
  hash: string;
  createdAt: number;
};

type RestoreManifest = {
  formatVersion: 1;
  auctionSession: {
    id: string;
  };
  league: {
    id: string;
  };
  database: {
    fileName: string;
    latestMigration: MigrationIdentity;
  };
  integrity: {
    status: string;
  };
};

export type PrepareRecoveryPointRestoreInput = {
  auctionSessionId: string;
  fileName: string;
};

export type PreparedRecoveryPointRestore = {
  auctionSessionId: string;
  fileName: string;
  sourcePath: string;
  candidatePath: string;
};

export type RecoveryPointRestoreServiceOptions = {
  sqlite: Database.Database;
  backupRoot: string;
  databasePath: string;
  recoveryPointCreator:
    RecoveryPointCreator;
  technicalLogger?:
    BackupRecoveryTechnicalLogger;
};

export class RecoveryPointRestoreError
  extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name =
      "RecoveryPointRestoreError";
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isRestoreManifest(
  value: unknown
): value is RestoreManifest {
  if (!isRecord(value)) {
    return false;
  }

  const auctionSession =
    value.auctionSession;
  const league =
    value.league;
  const database =
    value.database;
  const integrity =
    value.integrity;

  if (
    value.formatVersion !== 1 ||
    !isRecord(auctionSession) ||
    !isRecord(league) ||
    !isRecord(database) ||
    !isRecord(integrity) ||
    typeof auctionSession.id !==
      "string" ||
    typeof league.id !== "string" ||
    typeof database.fileName !==
      "string" ||
    typeof integrity.status !==
      "string"
  ) {
    return false;
  }

  const latestMigration =
    database.latestMigration;

  return (
    isRecord(latestMigration) &&
    typeof latestMigration.hash ===
      "string" &&
    typeof latestMigration.createdAt ===
      "number"
  );
}

async function findManifestPaths(
  directory: string
): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(
      directory,
      {
        withFileTypes: true
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }

  const result: string[] = [];

  for (const entry of entries) {
    const entryPath =
      path.join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {
      result.push(
        ...await findManifestPaths(
          entryPath
        )
      );
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".json")
    ) {
      result.push(entryPath);
    }
  }

  return result;
}

function readLatestMigration(
  database: Database.Database
): MigrationIdentity | null {
  try {
    return (
      database
        .prepare(
          `
            SELECT
              hash,
              created_at AS createdAt
            FROM __drizzle_migrations
            ORDER BY created_at DESC
            LIMIT 1
          `
        )
        .get() as
          MigrationIdentity | undefined
    ) ?? null;
  } catch {
    return null;
  }
}

function integrityIsOk(
  database: Database.Database
): boolean {
  const rows =
    database
      .prepare(
        "PRAGMA integrity_check"
      )
      .all() as
        Array<Record<string, unknown>>;

  if (rows.length !== 1) {
    return false;
  }

  const firstRow =
    rows[0];

  if (!firstRow) {
    return false;
  }

  const [value] =
    Object.values(firstRow);

  return String(value) === "ok";
}

export class RecoveryPointRestoreService {
  private readonly sqlite:
    Database.Database;

  private readonly backupRoot:
    string;

  private readonly databasePath:
    string;

  private readonly recoveryPointCreator:
    RecoveryPointCreator;

  private readonly technicalLogger:
    BackupRecoveryTechnicalLogger | undefined;

  constructor(
    options:
      RecoveryPointRestoreServiceOptions
  ) {
    this.sqlite = options.sqlite;
    this.backupRoot =
      options.backupRoot;
    this.databasePath =
      options.databasePath;
    this.recoveryPointCreator =
      options.recoveryPointCreator;

    this.technicalLogger =
      options.technicalLogger;
  }

  async prepareRestore(
    input:
      PrepareRecoveryPointRestoreInput
  ): Promise<
    PreparedRecoveryPointRestore
  > {
    this.technicalLogger?.info({
      event:
        "RESTORE_REQUESTED",
      auctionSessionId:
        input.auctionSessionId,
      fileName:
        input.fileName
    });

    this.technicalLogger?.info({
      event:
        "RESTORE_VALIDATION_STARTED",
      auctionSessionId:
        input.auctionSessionId,
      fileName:
        input.fileName
    });

    if (
      input.fileName.length === 0 ||
      path.basename(input.fileName) !==
        input.fileName ||
      !input.fileName.endsWith(
        ".sqlite"
      )
    ) {
      throw new RecoveryPointRestoreError(
        "RECOVERY_POINT_NOT_FOUND",
        "Recovery point not found"
      );
    }

    const manifestPaths =
      await findManifestPaths(
        this.backupRoot
      );

    const expectedManifestName =
      `${input.fileName.slice(
        0,
        -".sqlite".length
      )}.json`;

    let manifest:
      RestoreManifest | null = null;

    let sourcePath:
      string | null = null;

    for (
      const manifestPath
      of manifestPaths
    ) {
      if (
        path.basename(manifestPath) !==
          expectedManifestName
      ) {
        continue;
      }

      try {
        const parsed: unknown =
          JSON.parse(
            await readFile(
              manifestPath,
              "utf8"
            )
          );

        if (
          !isRestoreManifest(parsed) ||
          parsed.auctionSession.id !==
            input.auctionSessionId ||
          parsed.database.fileName !==
            input.fileName
        ) {
          continue;
        }

        manifest = parsed;
        sourcePath =
          path.join(
            path.dirname(
              manifestPath
            ),
            input.fileName
          );

        break;
      } catch {
        continue;
      }
    }

    if (!manifest || !sourcePath) {
      throw new RecoveryPointRestoreError(
        "RECOVERY_POINT_NOT_FOUND",
        "Recovery point not found"
      );
    }

    if (
      manifest.integrity.status !==
        "VALID"
    ) {
      throw new RecoveryPointRestoreError(
        "RECOVERY_POINT_INVALID",
        "Recovery point is not valid"
      );
    }

    const liveSession =
      this.sqlite
        .prepare(
          `
            SELECT
              id,
              league_id AS leagueId,
              status
            FROM auction_sessions
            WHERE id = ?
            LIMIT 1
          `
        )
        .get(
          input.auctionSessionId
        ) as
          | {
              id: string;
              leagueId: string;
              status: string;
            }
          | undefined;

    if (!liveSession) {
      throw new RecoveryPointRestoreError(
        "AUCTION_SESSION_NOT_FOUND",
        "Auction session not found"
      );
    }

    if (
      liveSession.status !==
        "SUSPENDED"
    ) {
      throw new RecoveryPointRestoreError(
        "AUCTION_SESSION_NOT_SUSPENDED",
        "Auction session must be suspended before restore"
      );
    }

    if (
      liveSession.leagueId !==
        manifest.league.id
    ) {
      throw new RecoveryPointRestoreError(
        "RECOVERY_POINT_INCOMPATIBLE",
        "Recovery point league does not match the live session"
      );
    }

    const liveMigration =
      readLatestMigration(
        this.sqlite
      );

    if (
      !liveMigration ||
      liveMigration.hash !==
        manifest.database
          .latestMigration.hash ||
      liveMigration.createdAt !==
        manifest.database
          .latestMigration.createdAt
    ) {
      throw new RecoveryPointRestoreError(
        "RECOVERY_POINT_INCOMPATIBLE",
        "Recovery point migration does not match the live database"
      );
    }

    const candidatePath =
      `${this.databasePath}.restore-candidate`;

    await rm(
      candidatePath,
      {
        force: true
      }
    );

    await copyFile(
      sourcePath,
      candidatePath
    );

    let candidate:
      Database.Database | null = null;

    try {
      candidate =
        new Database(
          candidatePath,
          {
            fileMustExist: true,
            readonly: true
          }
        );

      if (!integrityIsOk(candidate)) {
        throw new RecoveryPointRestoreError(
          "RECOVERY_POINT_INVALID",
          "Recovery point integrity check failed"
        );
      }

      const candidateSession =
        candidate
          .prepare(
            `
              SELECT
                id,
                league_id AS leagueId
              FROM auction_sessions
              WHERE id = ?
              LIMIT 1
            `
          )
          .get(
            input.auctionSessionId
          ) as
            | {
                id: string;
                leagueId: string;
              }
            | undefined;

      if (
        !candidateSession ||
        candidateSession.leagueId !==
          liveSession.leagueId
      ) {
        throw new RecoveryPointRestoreError(
          "RECOVERY_POINT_INCOMPATIBLE",
          "Recovery point session identity does not match"
        );
      }

      const candidateMigration =
        readLatestMigration(
          candidate
        );

      if (
        !candidateMigration ||
        candidateMigration.hash !==
          liveMigration.hash ||
        candidateMigration.createdAt !==
          liveMigration.createdAt
      ) {
        throw new RecoveryPointRestoreError(
          "RECOVERY_POINT_INCOMPATIBLE",
          "Recovery point migration does not match the candidate database"
        );
      }
    } catch (error) {
      await rm(
        candidatePath,
        {
          force: true
        }
      );

      throw error;
    } finally {
      candidate?.close();
    }

    try {
      await this.recoveryPointCreator
        .createRecoveryPoint({
          auctionSessionId:
            input.auctionSessionId,
          reason:
            "PRE_RESTORE"
        });

      this.technicalLogger?.info({
        event:
          "PRE_RESTORE_BACKUP_COMPLETED",
        auctionSessionId:
          input.auctionSessionId,
        leagueId:
          liveSession.leagueId,
        reason:
          "PRE_RESTORE",
        fileName:
          input.fileName
      });
    } catch (error) {
      await rm(
        candidatePath,
        {
          force: true
        }
      );

      throw error;
    }

    return {
      auctionSessionId:
        input.auctionSessionId,
      fileName:
        input.fileName,
      sourcePath,
      candidatePath
    };
  }
}
