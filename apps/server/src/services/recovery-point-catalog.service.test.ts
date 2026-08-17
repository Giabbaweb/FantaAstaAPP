import {
  mkdtemp,
  mkdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  RecoveryPointCatalogService
} from "./recovery-point-catalog.service.js";

const temporaryRoots: string[] = [];

async function createTemporaryRoot():
  Promise<string> {
  const root = await mkdtemp(
    path.join(
      os.tmpdir(),
      "fantaasta-catalog-"
    )
  );

  temporaryRoots.push(root);

  return root;
}

async function writeManifest(
  root: string,
  directory: string,
  fileName: string,
  overrides: {
    auctionSessionId?: string;
    createdAt?: string;
    reason?: string;
  } = {}
): Promise<void> {
  const targetDirectory =
    path.join(
      root,
      directory
    );

  await mkdir(
    targetDirectory,
    {
      recursive: true
    }
  );

  const manifest = {
    formatVersion: 1,
    createdAt:
      overrides.createdAt ??
      "2026-08-17T20:00:00.000Z",
    reason:
      overrides.reason ??
      "MANUAL_BACKUP",
    league: {
      id: "league-1",
      name: "SFL'92"
    },
    auctionSession: {
      id:
        overrides.auctionSessionId ??
        "session-1",
      season: "2026/2027",
      editionNumber: 35,
      status: "SUSPENDED",
      stateVersion: 12
    },
    database: {
      fileName:
        fileName.replace(
          ".json",
          ".sqlite"
        ),
      sizeBytes: 208896,
      latestMigration: {
        hash: "migration-hash",
        createdAt: 1786834202989
      }
    },
    integrity: {
      status: "VALID",
      messages: [
        "ok"
      ]
    },
    timing: {
      backupDurationMs: 17.3,
      totalDurationMs: 33
    }
  };

  await writeFile(
    path.join(
      targetDirectory,
      fileName
    ),
    `${JSON.stringify(
      manifest,
      null,
      2
    )}\n`,
    "utf8"
  );
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0)
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
  "RecoveryPointCatalogService",
  () => {
    it(
      "returns recovery points for one auction session newest first",
      async () => {
        const root =
          await createTemporaryRoot();

        await writeManifest(
          root,
          "sfl92/2026-2027",
          "older.json",
          {
            createdAt:
              "2026-08-17T20:00:00.000Z"
          }
        );

        await writeManifest(
          root,
          "sfl92/2026-2027",
          "newer.json",
          {
            createdAt:
              "2026-08-17T21:00:00.000Z",
            reason:
              "SESSION_SUSPENDED"
          }
        );

        await writeManifest(
          root,
          "other/2026-2027",
          "other-session.json",
          {
            auctionSessionId:
              "session-2",
            createdAt:
              "2026-08-17T22:00:00.000Z"
          }
        );

        const service =
          new RecoveryPointCatalogService({
            backupRoot: root
          });

        const result =
          await service
            .listForAuctionSession(
              "session-1"
            );

        expect(result)
          .toHaveLength(2);

        expect(
          result.map(
            (entry) =>
              entry.createdAt
          )
        ).toEqual([
          "2026-08-17T21:00:00.000Z",
          "2026-08-17T20:00:00.000Z"
        ]);

        expect(result[0]?.reason)
          .toBe(
            "SESSION_SUSPENDED"
          );
      }
    );

    it(
      "returns an empty catalog when backup root does not exist",
      async () => {
        const root =
          path.join(
            os.tmpdir(),
            `missing-fantaasta-${Date.now()}`
          );

        const service =
          new RecoveryPointCatalogService({
            backupRoot: root
          });

        await expect(
          service.listForAuctionSession(
            "session-1"
          )
        ).resolves.toEqual([]);
      }
    );

    it(
      "ignores malformed and invalid manifests",
      async () => {
        const root =
          await createTemporaryRoot();

        const directory =
          path.join(
            root,
            "sfl92",
            "2026-2027"
          );

        await mkdir(
          directory,
          {
            recursive: true
          }
        );

        await writeFile(
          path.join(
            directory,
            "malformed.json"
          ),
          "{ definitely-not-json",
          "utf8"
        );

        await writeFile(
          path.join(
            directory,
            "invalid.json"
          ),
          JSON.stringify({
            formatVersion: 999
          }),
          "utf8"
        );

        await writeManifest(
          root,
          "sfl92/2026-2027",
          "valid.json"
        );

        const service =
          new RecoveryPointCatalogService({
            backupRoot: root
          });

        const result =
          await service
            .listForAuctionSession(
              "session-1"
            );

        expect(result)
          .toHaveLength(1);

        expect(
          result[0]?.database.fileName
        ).toBe(
          "valid.sqlite"
        );
      }
    );

    it(
      "ignores manifests with unsupported reason or integrity status",
      async () => {
        const root =
          await createTemporaryRoot();

        const directory =
          path.join(
            root,
            "sfl92",
            "2026-2027"
          );

        await mkdir(
          directory,
          {
            recursive: true
          }
        );

        await writeManifest(
          root,
          "sfl92/2026-2027",
          "valid.json"
        );

        const invalidReason = {
          formatVersion: 1,
          createdAt:
            "2026-08-17T21:00:00.000Z",
          reason:
            "FAKE_REASON",
          league: {
            id: "league-1",
            name: "SFL'92"
          },
          auctionSession: {
            id: "session-1",
            season: "2026/2027",
            editionNumber: 35,
            status: "SUSPENDED",
            stateVersion: 12
          },
          database: {
            fileName:
              "invalid-reason.sqlite",
            sizeBytes: 100,
            latestMigration: {
              hash: "migration-hash",
              createdAt:
                1786834202989
            }
          },
          integrity: {
            status: "VALID",
            messages: ["ok"]
          },
          timing: {
            backupDurationMs: 1,
            totalDurationMs: 2
          }
        };

        const invalidIntegrity = {
          ...invalidReason,
          reason:
            "MANUAL_BACKUP",
          database: {
            ...invalidReason.database,
            fileName:
              "invalid-integrity.sqlite"
          },
          integrity: {
            status:
              "BROKEN_STATUS",
            messages: ["ok"]
          }
        };

        await writeFile(
          path.join(
            directory,
            "invalid-reason.json"
          ),
          JSON.stringify(
            invalidReason
          ),
          "utf8"
        );

        await writeFile(
          path.join(
            directory,
            "invalid-integrity.json"
          ),
          JSON.stringify(
            invalidIntegrity
          ),
          "utf8"
        );

        const service =
          new RecoveryPointCatalogService({
            backupRoot: root
          });

        const result =
          await service
            .listForAuctionSession(
              "session-1"
            );

        expect(result)
          .toHaveLength(1);

        expect(
          result[0]?.database.fileName
        ).toBe(
          "valid.sqlite"
        );
      }
    );

    it(
      "does not expose filesystem paths",
      async () => {
        const root =
          await createTemporaryRoot();

        await writeManifest(
          root,
          "sfl92/2026-2027",
          "backup.json"
        );

        const service =
          new RecoveryPointCatalogService({
            backupRoot: root
          });

        const result =
          await service
            .listForAuctionSession(
              "session-1"
            );

        const serialized =
          JSON.stringify(result);

        expect(serialized)
          .not.toContain(root);

        expect(serialized)
          .not.toContain(
            "manifestPath"
          );

        expect(serialized)
          .not.toContain(
            "sqlitePath"
          );
      }
    );
  }
);
