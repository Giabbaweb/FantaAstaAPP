import {
  copyFile,
  readFile,
  readdir,
  rm
} from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

type MigrationIdentity = {
  hash: string;
  createdAt: number;
};

type EmergencyRecoveryManifest = {
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

export type PrepareEmergencyRecoveryInput = {
  fileName: string;
};

export type PreparedEmergencyRecovery = {
  auctionSessionId: string;
  leagueId: string;
  fileName: string;
  sourcePath: string;
  candidatePath: string;
};

export type EmergencyRecoveryPreparationServiceOptions = {
  backupRoot: string;
  databasePath: string;
};

export class EmergencyRecoveryPreparationError
  extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);

    this.name =
      "EmergencyRecoveryPreparationError";
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

function isManifest(
  value: unknown
): value is EmergencyRecoveryManifest {
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
    entries =
      await readdir(
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

      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".json")
    ) {
      result.push(entryPath);
    }
  }

  return result;
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

  const row = rows[0];

  if (!row) {
    return false;
  }

  const [value] =
    Object.values(row);

  return String(value) === "ok";
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

export class EmergencyRecoveryPreparationService {
  private readonly backupRoot:
    string;

  private readonly databasePath:
    string;

  constructor(
    options:
      EmergencyRecoveryPreparationServiceOptions
  ) {
    this.backupRoot =
      options.backupRoot;

    this.databasePath =
      options.databasePath;
  }

  async prepare(
    input:
      PrepareEmergencyRecoveryInput
  ): Promise<PreparedEmergencyRecovery> {
    if (
      input.fileName.length === 0 ||
      path.basename(input.fileName) !==
        input.fileName ||
      !input.fileName.endsWith(
        ".sqlite"
      )
    ) {
      throw new EmergencyRecoveryPreparationError(
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
      EmergencyRecoveryManifest | null =
        null;

    let sourcePath:
      string | null =
        null;

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
          !isManifest(parsed) ||
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
      throw new EmergencyRecoveryPreparationError(
        "RECOVERY_POINT_NOT_FOUND",
        "Recovery point not found"
      );
    }

    if (
      manifest.integrity.status !==
        "VALID"
    ) {
      throw new EmergencyRecoveryPreparationError(
        "RECOVERY_POINT_INVALID",
        "Recovery point is not valid"
      );
    }

    const candidatePath =
      `${this.databasePath}.emergency-restore-candidate`;

    await rm(
      candidatePath,
      {
        force: true
      }
    );

    try {
      await copyFile(
        sourcePath,
        candidatePath
      );
    } catch {
      throw new EmergencyRecoveryPreparationError(
        "RECOVERY_POINT_NOT_FOUND",
        "Recovery point database not found"
      );
    }

    let candidate:
      Database.Database | null =
        null;

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
        throw new EmergencyRecoveryPreparationError(
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
            manifest.auctionSession.id
          ) as
            | {
                id: string;
                leagueId: string;
              }
            | undefined;

      if (
        !candidateSession ||
        candidateSession.leagueId !==
          manifest.league.id
      ) {
        throw new EmergencyRecoveryPreparationError(
          "RECOVERY_POINT_INCOMPATIBLE",
          "Recovery point identity does not match its manifest"
        );
      }

      const migration =
        readLatestMigration(
          candidate
        );

      if (
        !migration ||
        migration.hash !==
          manifest.database
            .latestMigration.hash ||
        migration.createdAt !==
          manifest.database
            .latestMigration.createdAt
      ) {
        throw new EmergencyRecoveryPreparationError(
          "RECOVERY_POINT_INCOMPATIBLE",
          "Recovery point migration does not match its manifest"
        );
      }
    } catch (error) {
      candidate?.close();
      candidate = null;

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

    return {
      auctionSessionId:
        manifest.auctionSession.id,
      leagueId:
        manifest.league.id,
      fileName:
        input.fileName,
      sourcePath,
      candidatePath
    };
  }
}
