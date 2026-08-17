import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  RecoveryPointRestoreError,
  RecoveryPointRestoreService
} from "./recovery-point-restore.service.js";

const roots: string[] = [];

async function createRoot() {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-restore-"
      )
    );

  roots.push(root);

  return root;
}

function initializeDatabase(
  databasePath: string,
  input: {
    sessionId?: string;
    leagueId?: string;
    status?: string;
    migrationHash?: string;
    migrationCreatedAt?: number;
  } = {}
) {
  const sqlite =
    new Database(databasePath);

  sqlite.exec(`
    CREATE TABLE leagues (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE auction_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      league_id TEXT NOT NULL,
      season TEXT NOT NULL,
      edition_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      state_version INTEGER NOT NULL
    );

    CREATE TABLE __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const sessionId =
    input.sessionId ??
    "session-1";

  const leagueId =
    input.leagueId ??
    "league-1";

  sqlite
    .prepare(
      `
        INSERT INTO leagues (
          id,
          name
        ) VALUES (?, ?)
      `
    )
    .run(
      leagueId,
      "SFL'92"
    );

  sqlite
    .prepare(
      `
        INSERT INTO auction_sessions (
          id,
          league_id,
          season,
          edition_number,
          status,
          state_version
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      sessionId,
      leagueId,
      "2026/2027",
      35,
      input.status ??
        "SUSPENDED",
      10
    );

  sqlite
    .prepare(
      `
        INSERT INTO __drizzle_migrations (
          hash,
          created_at
        ) VALUES (?, ?)
      `
    )
    .run(
      input.migrationHash ??
        "migration-hash-0020",
      input.migrationCreatedAt ??
        1786834202989
    );

  return sqlite;
}

async function createRecoveryPointFixture(
  root: string,
  input: {
    sessionId?: string;
    leagueId?: string;
    integrityStatus?: string;
    migrationHash?: string;
    migrationCreatedAt?: number;
    corruptSqlite?: boolean;
  } = {}
) {
  const directory =
    path.join(
      root,
      "backups",
      "sfl92",
      "2026-2027"
    );

  await mkdir(
    directory,
    {
      recursive: true
    }
  );

  const fileName =
    "SFL92_2026-2027_test_MANUAL-BACKUP.sqlite";

  const sqlitePath =
    path.join(
      directory,
      fileName
    );

  const manifestPath =
    path.join(
      directory,
      "SFL92_2026-2027_test_MANUAL-BACKUP.json"
    );

  if (
    input.corruptSqlite
  ) {
    await writeFile(
      sqlitePath,
      "not-a-sqlite-database",
      "utf8"
    );
  } else {
    const databaseInput: {
      sessionId?: string;
      leagueId?: string;
      migrationHash?: string;
      migrationCreatedAt?: number;
    } = {};

    if (input.sessionId !== undefined) {
      databaseInput.sessionId =
        input.sessionId;
    }

    if (input.leagueId !== undefined) {
      databaseInput.leagueId =
        input.leagueId;
    }

    if (
      input.migrationHash !==
      undefined
    ) {
      databaseInput.migrationHash =
        input.migrationHash;
    }

    if (
      input.migrationCreatedAt !==
      undefined
    ) {
      databaseInput.migrationCreatedAt =
        input.migrationCreatedAt;
    }

    const backup =
      initializeDatabase(
        sqlitePath,
        databaseInput
      );

    backup.close();
  }

  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        formatVersion: 1,
        auctionSession: {
          id:
            input.sessionId ??
            "session-1"
        },
        league: {
          id:
            input.leagueId ??
            "league-1"
        },
        database: {
          fileName,
          latestMigration: {
            hash:
              input.migrationHash ??
              "migration-hash-0020",
            createdAt:
              input.migrationCreatedAt ??
              1786834202989
          }
        },
        integrity: {
          status:
            input.integrityStatus ??
            "VALID"
        }
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    fileName,
    sqlitePath,
    manifestPath
  };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0)
      .map(
        (root) =>
          rm(
            root,
            {
              recursive: true,
              force: true
            }
          )
      )
  );
});

describe(
  "RecoveryPointRestoreService",
  () => {
    it(
      "prepares a valid recovery point and creates PRE_RESTORE",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath
          );

        const fixture =
          await createRecoveryPointFixture(
            root
          );

        const createRecoveryPoint =
          vi.fn(
            async () => ({})
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint
            }
          });

        try {
          const result =
            await service
              .prepareRestore({
                auctionSessionId:
                  "session-1",
                fileName:
                  fixture.fileName
              });

          expect(result)
            .toEqual({
              auctionSessionId:
                "session-1",
              fileName:
                fixture.fileName,
              sourcePath:
                fixture.sqlitePath,
              candidatePath:
                `${databasePath}.restore-candidate`
            });

          await expect(
            stat(
              result.candidatePath
            )
          ).resolves.toBeDefined();

          expect(
            createRecoveryPoint
          ).toHaveBeenCalledWith({
            auctionSessionId:
              "session-1",
            reason:
              "PRE_RESTORE"
          });
        } finally {
          sqlite.close();
        }
      }
    );

    it(
      "rejects restore when the live session is not suspended",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath,
            {
              status: "RUNNING"
            }
          );

        const fixture =
          await createRecoveryPointFixture(
            root
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint:
                vi.fn()
            }
          });

        try {
          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                fixture.fileName
            })
          ).rejects.toMatchObject({
            code:
              "AUCTION_SESSION_NOT_SUSPENDED"
          });
        } finally {
          sqlite.close();
        }
      }
    );

    it(
      "rejects a manifest not marked VALID",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath
          );

        const fixture =
          await createRecoveryPointFixture(
            root,
            {
              integrityStatus:
                "INVALID"
            }
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint:
                vi.fn()
            }
          });

        try {
          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                fixture.fileName
            })
          ).rejects.toMatchObject({
            code:
              "RECOVERY_POINT_INVALID"
          });
        } finally {
          sqlite.close();
        }
      }
    );

    it(
      "rejects a recovery point from another league",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath
          );

        const fixture =
          await createRecoveryPointFixture(
            root,
            {
              leagueId:
                "league-other"
            }
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint:
                vi.fn()
            }
          });

        try {
          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                fixture.fileName
            })
          ).rejects.toMatchObject({
            code:
              "RECOVERY_POINT_INCOMPATIBLE"
          });
        } finally {
          sqlite.close();
        }
      }
    );

    it(
      "rejects an incompatible migration",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath
          );

        const fixture =
          await createRecoveryPointFixture(
            root,
            {
              migrationHash:
                "different-migration"
            }
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint:
                vi.fn()
            }
          });

        try {
          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                fixture.fileName
            })
          ).rejects.toMatchObject({
            code:
              "RECOVERY_POINT_INCOMPATIBLE"
          });
        } finally {
          sqlite.close();
        }
      }
    );

    it(
      "removes the candidate when the recovery point database is corrupt",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath
          );

        const fixture =
          await createRecoveryPointFixture(
            root,
            {
              corruptSqlite: true
            }
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint:
                vi.fn()
            }
          });

        try {
          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                fixture.fileName
            })
          ).rejects.toBeDefined();

          await expect(
            readFile(
              `${databasePath}.restore-candidate`
            )
          ).rejects.toMatchObject({
            code: "ENOENT"
          });
        } finally {
          sqlite.close();
        }
      }
    );

    it(
      "removes the candidate when PRE_RESTORE creation fails",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath
          );

        const fixture =
          await createRecoveryPointFixture(
            root
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint:
                vi.fn(
                  async () => {
                    throw new Error(
                      "PRE_RESTORE failed"
                    );
                  }
                )
            }
          });

        try {
          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                fixture.fileName
            })
          ).rejects.toThrow(
            "PRE_RESTORE failed"
          );

          await expect(
            readFile(
              `${databasePath}.restore-candidate`
            )
          ).rejects.toMatchObject({
            code: "ENOENT"
          });
        } finally {
          sqlite.close();
        }
      }
    );

    it(
      "rejects path traversal and unknown recovery points",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const sqlite =
          initializeDatabase(
            databasePath
          );

        const service =
          new RecoveryPointRestoreService({
            sqlite,
            databasePath,
            backupRoot:
              path.join(
                root,
                "backups"
              ),
            recoveryPointCreator: {
              createRecoveryPoint:
                vi.fn()
            }
          });

        try {
          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                "../evil.sqlite"
            })
          ).rejects.toMatchObject({
            code:
              "RECOVERY_POINT_NOT_FOUND"
          });

          await expect(
            service.prepareRestore({
              auctionSessionId:
                "session-1",
              fileName:
                "missing.sqlite"
            })
          ).rejects.toBeInstanceOf(
            RecoveryPointRestoreError
          );
        } finally {
          sqlite.close();
        }
      }
    );
  }
);
