import {
  mkdir,
  mkdtemp,
  rm,
  writeFile
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
  EmergencyRecoveryPreparationError,
  EmergencyRecoveryPreparationService
} from "./emergency-recovery-preparation.service.js";

const roots: string[] = [];

async function createFixture() {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-emergency-"
      )
    );

  roots.push(root);

  const backupRoot =
    path.join(
      root,
      "backups"
    );

  const databasePath =
    path.join(
      root,
      "live.sqlite"
    );

  const backupDirectory =
    path.join(
      backupRoot,
      "session-1"
    );

  await mkdir(
    backupDirectory,
    {
      recursive: true
    }
  );

  const fileName =
    "recovery.sqlite";

  const sqlitePath =
    path.join(
      backupDirectory,
      fileName
    );

  const database =
    new Database(sqlitePath);

  database.exec(`
    CREATE TABLE auction_sessions (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL
    );

    CREATE TABLE __drizzle_migrations (
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    INSERT INTO auction_sessions (
      id,
      league_id
    ) VALUES (
      'session-1',
      'league-1'
    );

    INSERT INTO __drizzle_migrations (
      hash,
      created_at
    ) VALUES (
      'migration-hash',
      123456
    );
  `);

  database.close();

  const manifestPath =
    path.join(
      backupDirectory,
      "recovery.json"
    );

  const manifest = {
    formatVersion: 1,
    createdAt:
      "2026-08-18T20:00:00.000Z",
    reason:
      "MANUAL_BACKUP",
    league: {
      id:
        "league-1",
      name:
        "League"
    },
    auctionSession: {
      id:
        "session-1",
      season:
        "2026/2027",
      editionNumber:
        35,
      status:
        "SUSPENDED",
      stateVersion:
        10
    },
    database: {
      fileName,
      sizeBytes:
        1,
      latestMigration: {
        hash:
          "migration-hash",
        createdAt:
          123456
      }
    },
    integrity: {
      status:
        "VALID",
      messages: [
        "ok"
      ]
    },
    timing: {
      backupDurationMs:
        1,
      totalDurationMs:
        2
    }
  };

  await writeFile(
    manifestPath,
    `${JSON.stringify(
      manifest,
      null,
      2
    )}\n`,
    "utf8"
  );

  return {
    backupRoot,
    databasePath,
    backupDirectory,
    fileName,
    manifestPath,
    manifest
  };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map(
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
  "EmergencyRecoveryPreparationService",
  () => {
    it(
      "prepares a valid recovery point without opening the live database",
      async () => {
        const fixture =
          await createFixture();

        const service =
          new EmergencyRecoveryPreparationService({
            backupRoot:
              fixture.backupRoot,
            databasePath:
              fixture.databasePath
          });

        await expect(
          service.prepare({
            fileName:
              fixture.fileName
          })
        ).resolves.toMatchObject({
          auctionSessionId:
            "session-1",
          leagueId:
            "league-1",
          fileName:
            fixture.fileName,
          candidatePath:
            `${fixture.databasePath}.emergency-restore-candidate`
        });
      }
    );

    it(
      "rejects a recovery point whose manifest is not VALID",
      async () => {
        const fixture =
          await createFixture();

        await writeFile(
          fixture.manifestPath,
          `${JSON.stringify(
            {
              ...fixture.manifest,
              integrity: {
                status:
                  "INVALID",
                messages: [
                  "broken"
                ]
              }
            },
            null,
            2
          )}\n`,
          "utf8"
        );

        const service =
          new EmergencyRecoveryPreparationService({
            backupRoot:
              fixture.backupRoot,
            databasePath:
              fixture.databasePath
          });

        await expect(
          service.prepare({
            fileName:
              fixture.fileName
          })
        ).rejects.toMatchObject({
          code:
            "RECOVERY_POINT_INVALID"
        });
      }
    );

    it(
      "rejects a candidate whose identity does not match the manifest",
      async () => {
        const fixture =
          await createFixture();

        await writeFile(
          fixture.manifestPath,
          `${JSON.stringify(
            {
              ...fixture.manifest,
              league: {
                ...fixture.manifest.league,
                id:
                  "wrong-league"
              }
            },
            null,
            2
          )}\n`,
          "utf8"
        );

        const service =
          new EmergencyRecoveryPreparationService({
            backupRoot:
              fixture.backupRoot,
            databasePath:
              fixture.databasePath
          });

        await expect(
          service.prepare({
            fileName:
              fixture.fileName
          })
        ).rejects.toMatchObject({
          code:
            "RECOVERY_POINT_INCOMPATIBLE"
        });
      }
    );

    it(
      "does not require the live database to exist",
      async () => {
        const fixture =
          await createFixture();

        const service =
          new EmergencyRecoveryPreparationService({
            backupRoot:
              fixture.backupRoot,
            databasePath:
              fixture.databasePath
          });

        await expect(
          service.prepare({
            fileName:
              fixture.fileName
          })
        ).resolves.toBeDefined();
      }
    );

    it(
      "rejects a missing recovery point",
      async () => {
        const fixture =
          await createFixture();

        const service =
          new EmergencyRecoveryPreparationService({
            backupRoot:
              fixture.backupRoot,
            databasePath:
              fixture.databasePath
          });

        await expect(
          service.prepare({
            fileName:
              "missing.sqlite"
          })
        ).rejects.toBeInstanceOf(
          EmergencyRecoveryPreparationError
        );
      }
    );
  }
);
