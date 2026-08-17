import {
  mkdtemp,
  readFile,
  rm,
  stat
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  SqliteRecoveryPointService
} from "./sqlite-recovery-point.service.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const root = await mkdtemp(
    path.join(
      os.tmpdir(),
      "fantaasta-recovery-point-"
    )
  );

  temporaryDirectories.push(root);

  const databasePath = path.join(
    root,
    "source.sqlite"
  );

  const sqlite = new Database(databasePath);

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

    INSERT INTO leagues (
      id,
      name
    ) VALUES (
      'league-sfl92',
      'SFL''92'
    );

    INSERT INTO auction_sessions (
      id,
      league_id,
      season,
      edition_number,
      status,
      state_version
    ) VALUES (
      'session-2026',
      'league-sfl92',
      '2026/2027',
      35,
      'SUSPENDED',
      157
    );

    INSERT INTO __drizzle_migrations (
      hash,
      created_at
    ) VALUES (
      'migration-hash-0020',
      1786834202989
    );
  `);

  return {
    root,
    sqlite
  };
}

afterEach(async () => {
  for (
    const directory of
    temporaryDirectories.splice(0)
  ) {
    await rm(directory, {
      recursive: true,
      force: true
    });
  }
});

describe(
  "SqliteRecoveryPointService",
  () => {
    it(
      "creates a valid SQLite recovery point and manifest",
      async () => {
        const fixture =
          await createFixture();

        try {
          const service =
            new SqliteRecoveryPointService({
              sqlite: fixture.sqlite,
              backupRoot: path.join(
                fixture.root,
                "backups"
              ),
              now: () =>
                new Date(
                  "2026-09-16T20:31:17.123Z"
                )
            });

          const result =
            await service.createRecoveryPoint({
              auctionSessionId:
                "session-2026",
              reason:
                "CONFIRMED_AWARD"
            });

          expect(result.sqlitePath).toContain(
            path.join(
              "backups",
              "sfl92",
              "2026-2027"
            )
          );

          expect(
            path.basename(result.sqlitePath)
          ).toBe(
            "SFL92_2026-2027_" +
              "2026-09-16_20-31-17-123Z_" +
              "CONFIRMED-AWARD.sqlite"
          );

          expect(
            (
              await stat(
                result.sqlitePath
              )
            ).size
          ).toBeGreaterThan(0);

          const backupDatabase =
            new Database(
              result.sqlitePath,
              {
                readonly: true,
                fileMustExist: true
              }
            );

          try {
            const session =
              backupDatabase
                .prepare(
                  `
                    SELECT
                      status,
                      state_version AS stateVersion
                    FROM auction_sessions
                    WHERE id = ?
                  `
                )
                .get(
                  "session-2026"
                ) as {
                  status: string;
                  stateVersion: number;
                };

            expect(session).toEqual({
              status: "SUSPENDED",
              stateVersion: 157
            });

            expect(
              backupDatabase.pragma(
                "journal_mode",
                {
                  simple: true
                }
              )
            ).toBe("delete");
          } finally {
            backupDatabase.close();
          }

          await expect(
            stat(
              `${result.sqlitePath}-wal`
            )
          ).rejects.toMatchObject({
            code: "ENOENT"
          });

          await expect(
            stat(
              `${result.sqlitePath}-shm`
            )
          ).rejects.toMatchObject({
            code: "ENOENT"
          });

          expect(
            result.manifest.integrity.status
          ).toBe("VALID");

          expect(
            result.manifest.integrity.messages
          ).toEqual(["ok"]);

          expect(
            result.manifest.league
          ).toEqual({
            id: "league-sfl92",
            name: "SFL'92"
          });

          expect(
            result.manifest.auctionSession
          ).toEqual({
            id: "session-2026",
            season: "2026/2027",
            editionNumber: 35,
            status: "SUSPENDED",
            stateVersion: 157
          });

          expect(
            result.manifest.database
              .latestMigration
          ).toEqual({
            hash: "migration-hash-0020",
            createdAt: 1786834202989
          });

          expect(
            result.manifest.timing
              .backupDurationMs
          ).toBeGreaterThanOrEqual(0);

          const persistedManifest =
            JSON.parse(
              await readFile(
                result.manifestPath,
                "utf8"
              )
            );

          expect(
            persistedManifest.integrity
              .status
          ).toBe("VALID");
        } finally {
          fixture.sqlite.close();
        }
      }
    );

    it(
      "rejects a request for an unknown auction session",
      async () => {
        const fixture =
          await createFixture();

        try {
          const service =
            new SqliteRecoveryPointService({
              sqlite: fixture.sqlite,
              backupRoot: path.join(
                fixture.root,
                "backups"
              )
            });

          await expect(
            service.createRecoveryPoint({
              auctionSessionId:
                "missing-session",
              reason: "MANUAL_BACKUP"
            })
          ).rejects.toThrow(
            "Auction session not found for backup"
          );
        } finally {
          fixture.sqlite.close();
        }
      }
    );
  }
);
