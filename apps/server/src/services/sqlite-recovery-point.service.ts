import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

import type { BackupRecoveryTechnicalLogger } from "./backup-recovery-technical-logger.js";

export type RecoveryPointReason =
  | "CONFIRMED_AWARD"
  | "MANUAL_ASSIGNMENT"
  | "TECHNICAL_CORRECTION"
  | "SESSION_SUSPENDED"
  | "SESSION_COMPLETED"
  | "RECOVERY_RESTART"
  | "MANUAL_BACKUP"
  | "PRE_RESTORE";

export type RecoveryPointIntegrityStatus =
  | "VALID"
  | "INVALID"
  | "UNCHECKED"
  | "INCOMPATIBLE";

type RecoveryPointSessionIdentity = {
  auctionSessionId: string;
  leagueId: string;
  leagueName: string;
  season: string;
  editionNumber: number;
  status: string;
  stateVersion: number;
};

type MigrationIdentity = {
  hash: string;
  createdAt: number;
};

export type RecoveryPointManifest = {
  formatVersion: 1;
  createdAt: string;
  reason: RecoveryPointReason;
  league: {
    id: string;
    name: string;
  };
  auctionSession: {
    id: string;
    season: string;
    editionNumber: number;
    status: string;
    stateVersion: number;
  };
  database: {
    fileName: string;
    sizeBytes: number;
    latestMigration: MigrationIdentity;
  };
  integrity: {
    status: RecoveryPointIntegrityStatus;
    messages: string[];
  };
  timing: {
    backupDurationMs: number;
    totalDurationMs: number;
  };
};

export type CreateRecoveryPointInput = {
  auctionSessionId: string;
  reason: RecoveryPointReason;
};

export type CreateRecoveryPointResult = {
  sqlitePath: string;
  manifestPath: string;
  manifest: RecoveryPointManifest;
};

export type SqliteRecoveryPointServiceOptions = {
  sqlite: Database.Database;
  backupRoot: string;
  now?: () => Date;
  technicalLogger?: BackupRecoveryTechnicalLogger;
};

function toReadableSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function toTimestampSlug(value: Date): string {
  return value.toISOString().replace("T", "_").replace(/[:.]/g, "-");
}

function toReasonSlug(reason: RecoveryPointReason): string {
  return reason.replaceAll("_", "-");
}

function readSessionIdentity(
  database: Database.Database,
  auctionSessionId: string,
): RecoveryPointSessionIdentity | null {
  const row = database
    .prepare(
      `
        SELECT
          auction_sessions.id AS auctionSessionId,
          auction_sessions.league_id AS leagueId,
          leagues.name AS leagueName,
          auction_sessions.season AS season,
          auction_sessions.edition_number AS editionNumber,
          auction_sessions.status AS status,
          auction_sessions.state_version AS stateVersion
        FROM auction_sessions
        INNER JOIN leagues
          ON leagues.id = auction_sessions.league_id
        WHERE auction_sessions.id = ?
        LIMIT 1
      `,
    )
    .get(auctionSessionId) as RecoveryPointSessionIdentity | undefined;

  return row ?? null;
}

function readLatestMigration(
  database: Database.Database,
): MigrationIdentity | null {
  try {
    const row = database
      .prepare(
        `
          SELECT
            hash,
            created_at AS createdAt
          FROM __drizzle_migrations
          ORDER BY created_at DESC
          LIMIT 1
        `,
      )
      .get() as MigrationIdentity | undefined;

    return row ?? null;
  } catch {
    return null;
  }
}

function runIntegrityCheck(database: Database.Database): string[] {
  const rows = database.prepare("PRAGMA integrity_check").all() as Array<
    Record<string, unknown>
  >;

  return rows.map((row) => {
    const [value] = Object.values(row);

    return String(value);
  });
}

export class SqliteRecoveryPointService {
  private readonly sqlite: Database.Database;
  private readonly backupRoot: string;
  private readonly now: () => Date;
  private readonly technicalLogger: BackupRecoveryTechnicalLogger | undefined;

  constructor(options: SqliteRecoveryPointServiceOptions) {
    this.sqlite = options.sqlite;
    this.backupRoot = options.backupRoot;
    this.now = options.now ?? (() => new Date());
    this.technicalLogger = options.technicalLogger;
  }

  async createRecoveryPoint(
    input: CreateRecoveryPointInput,
  ): Promise<CreateRecoveryPointResult> {
    const startedAt = performance.now();

    this.technicalLogger?.info({
      event: "BACKUP_STARTED",
      auctionSessionId: input.auctionSessionId,
      reason: input.reason,
    });

    try {
      const sourceIdentity = readSessionIdentity(
        this.sqlite,
        input.auctionSessionId,
      );

      if (!sourceIdentity) {
        throw new Error(
          `Auction session not found for backup: ${input.auctionSessionId}`,
        );
      }

      const leagueSlug = toReadableSlug(sourceIdentity.leagueName);
      const seasonSlug = toReadableSlug(sourceIdentity.season);

      if (!leagueSlug || !seasonSlug) {
        throw new Error("Cannot build backup path from league and season");
      }

      const createdAt = this.now();
      const timestampSlug = toTimestampSlug(createdAt);
      const reasonSlug = toReasonSlug(input.reason);

      const directory = path.join(this.backupRoot, leagueSlug, seasonSlug);

      await mkdir(directory, {
        recursive: true,
      });

      const readableLeague = leagueSlug.toUpperCase();

      const baseName = [
        readableLeague,
        seasonSlug,
        timestampSlug,
        reasonSlug,
      ].join("_");

      const sqlitePath = path.join(directory, `${baseName}.sqlite`);

      const manifestPath = path.join(directory, `${baseName}.json`);

      const backupStartedAt = performance.now();

      await this.sqlite.backup(sqlitePath);

      const backupDurationMs = performance.now() - backupStartedAt;

      const backupDatabase = new Database(sqlitePath, {
        fileMustExist: true,
      });

      const backupJournalMode = backupDatabase.pragma("journal_mode = DELETE", {
        simple: true,
      });

      if (backupJournalMode !== "delete") {
        backupDatabase.close();

        throw new Error("Failed to normalize recovery point journal mode");
      }

      let integrityMessages: string[];
      let backupIdentity: RecoveryPointSessionIdentity | null;
      let latestMigration: MigrationIdentity | null;

      try {
        integrityMessages = runIntegrityCheck(backupDatabase);

        backupIdentity = readSessionIdentity(
          backupDatabase,
          input.auctionSessionId,
        );

        latestMigration = readLatestMigration(backupDatabase);
      } finally {
        backupDatabase.close();
      }

      const identityMatches =
        backupIdentity !== null &&
        backupIdentity.auctionSessionId === sourceIdentity.auctionSessionId &&
        backupIdentity.leagueId === sourceIdentity.leagueId &&
        backupIdentity.season === sourceIdentity.season;

      const integrityOk =
        integrityMessages.length === 1 && integrityMessages[0] === "ok";

      const integrityStatus: RecoveryPointIntegrityStatus =
        integrityOk && identityMatches && latestMigration !== null
          ? "VALID"
          : "INVALID";

      const backupStats = await stat(sqlitePath);

      const totalDurationMs = performance.now() - startedAt;

      const manifest: RecoveryPointManifest = {
        formatVersion: 1,
        createdAt: createdAt.toISOString(),
        reason: input.reason,
        league: {
          id: sourceIdentity.leagueId,
          name: sourceIdentity.leagueName,
        },
        auctionSession: {
          id: sourceIdentity.auctionSessionId,
          season: sourceIdentity.season,
          editionNumber: sourceIdentity.editionNumber,
          status: sourceIdentity.status,
          stateVersion: sourceIdentity.stateVersion,
        },
        database: {
          fileName: path.basename(sqlitePath),
          sizeBytes: backupStats.size,
          latestMigration: latestMigration ?? {
            hash: "",
            createdAt: 0,
          },
        },
        integrity: {
          status: integrityStatus,
          messages: integrityMessages,
        },
        timing: {
          backupDurationMs,
          totalDurationMs,
        },
      };

      await writeFile(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8",
      );

      this.technicalLogger?.info({
        event: "BACKUP_COMPLETED",
        auctionSessionId: input.auctionSessionId,
        leagueId: sourceIdentity.leagueId,
        reason: input.reason,
        fileName: manifest.database.fileName,
        sizeBytes: manifest.database.sizeBytes,
        durationMs: manifest.timing.totalDurationMs,
        integrity: manifest.integrity.status,
      });

      return {
        sqlitePath,
        manifestPath,
        manifest,
      };
    } catch (error) {
      this.technicalLogger?.error({
        event: "BACKUP_FAILED",
        auctionSessionId: input.auctionSessionId,
        reason: input.reason,
        durationMs: performance.now() - startedAt,
        error,
      });

      throw error;
    }
  }
}
