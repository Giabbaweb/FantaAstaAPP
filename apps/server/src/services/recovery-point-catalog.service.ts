import {
  readdir,
  readFile
} from "node:fs/promises";
import path from "node:path";

import type {
  RecoveryPointIntegrityStatus,
  RecoveryPointManifest,
  RecoveryPointReason
} from "./sqlite-recovery-point.service.js";

export type RecoveryPointCatalogEntry = {
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
    latestMigration: {
      hash: string;
      createdAt: number;
    };
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

export type RecoveryPointCatalogServiceOptions = {
  backupRoot: string;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

const recoveryPointReasons = new Set<
  RecoveryPointReason
>([
  "CONFIRMED_AWARD",
  "MANUAL_ASSIGNMENT",
  "TECHNICAL_CORRECTION",
  "SESSION_SUSPENDED",
  "SESSION_COMPLETED",
  "RECOVERY_RESTART",
  "MANUAL_BACKUP",
  "PRE_RESTORE"
]);

const recoveryPointIntegrityStatuses =
  new Set<RecoveryPointIntegrityStatus>([
    "VALID",
    "INVALID",
    "UNCHECKED",
    "INCOMPATIBLE"
  ]);

function isRecoveryPointManifest(
  value: unknown
): value is RecoveryPointManifest {
  if (!isRecord(value)) {
    return false;
  }

  const league = value.league;
  const auctionSession =
    value.auctionSession;
  const database = value.database;
  const integrity = value.integrity;
  const timing = value.timing;

  if (
    value.formatVersion !== 1 ||
    typeof value.createdAt !== "string" ||
    typeof value.reason !== "string" ||
    !recoveryPointReasons.has(
      value.reason as RecoveryPointReason
    ) ||
    !isRecord(league) ||
    !isRecord(auctionSession) ||
    !isRecord(database) ||
    !isRecord(integrity) ||
    !isRecord(timing)
  ) {
    return false;
  }

  const latestMigration =
    database.latestMigration;

  if (!isRecord(latestMigration)) {
    return false;
  }

  return (
    typeof league.id === "string" &&
    typeof league.name === "string" &&
    typeof auctionSession.id ===
      "string" &&
    typeof auctionSession.season ===
      "string" &&
    typeof auctionSession.editionNumber ===
      "number" &&
    typeof auctionSession.status ===
      "string" &&
    typeof auctionSession.stateVersion ===
      "number" &&
    typeof database.fileName ===
      "string" &&
    typeof database.sizeBytes ===
      "number" &&
    typeof latestMigration.hash ===
      "string" &&
    typeof latestMigration.createdAt ===
      "number" &&
    typeof integrity.status ===
      "string" &&
    recoveryPointIntegrityStatuses.has(
      integrity.status as RecoveryPointIntegrityStatus
    ) &&
    Array.isArray(
      integrity.messages
    ) &&
    integrity.messages.every(
      (message) =>
        typeof message === "string"
    ) &&
    typeof timing.backupDurationMs ===
      "number" &&
    typeof timing.totalDurationMs ===
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

  const manifestPaths: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      manifestPaths.push(
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
      manifestPaths.push(
        entryPath
      );
    }
  }

  return manifestPaths;
}

function toCatalogEntry(
  manifest: RecoveryPointManifest
): RecoveryPointCatalogEntry {
  return {
    createdAt: manifest.createdAt,
    reason: manifest.reason,
    league: manifest.league,
    auctionSession:
      manifest.auctionSession,
    database: {
      fileName:
        manifest.database.fileName,
      sizeBytes:
        manifest.database.sizeBytes,
      latestMigration:
        manifest.database
          .latestMigration
    },
    integrity: manifest.integrity,
    timing: manifest.timing
  };
}

export class RecoveryPointCatalogService {
  private readonly backupRoot: string;

  constructor(
    options:
      RecoveryPointCatalogServiceOptions
  ) {
    this.backupRoot =
      options.backupRoot;
  }

  async listForAuctionSession(
    auctionSessionId: string
  ): Promise<
    RecoveryPointCatalogEntry[]
  > {
    const manifestPaths =
      await findManifestPaths(
        this.backupRoot
      );

    const catalogEntries:
      RecoveryPointCatalogEntry[] = [];

    for (
      const manifestPath
      of manifestPaths
    ) {
      try {
        const contents =
          await readFile(
            manifestPath,
            "utf8"
          );

        const parsed: unknown =
          JSON.parse(contents);

        if (
          !isRecoveryPointManifest(
            parsed
          )
        ) {
          continue;
        }

        if (
          parsed.auctionSession.id !==
          auctionSessionId
        ) {
          continue;
        }

        catalogEntries.push(
          toCatalogEntry(parsed)
        );
      } catch {
        continue;
      }
    }

    return catalogEntries.sort(
      (left, right) =>
        right.createdAt.localeCompare(
          left.createdAt
        )
    );
  }
}
