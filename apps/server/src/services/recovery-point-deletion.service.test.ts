import {
  mkdir,
  mkdtemp,
  readFile,
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
  RecoveryPointDeletionService,
  RecoveryPointNotFoundError
} from "./recovery-point-deletion.service.js";

const roots: string[] = [];

async function createRoot() {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-recovery-delete-"
      )
    );

  roots.push(root);

  return root;
}

async function createRecoveryPoint(
  root: string,
  options: {
    sessionId: string;
    baseName: string;
  }
) {
  const directory =
    path.join(
      root,
      "sfl92",
      "2026-2027"
    );

  await mkdir(directory, {
    recursive: true
  });

  const fileName =
    `${options.baseName}.sqlite`;

  const sqlitePath =
    path.join(
      directory,
      fileName
    );

  const manifestPath =
    path.join(
      directory,
      `${options.baseName}.json`
    );

  await writeFile(
    sqlitePath,
    "sqlite-backup"
  );

  await writeFile(
    manifestPath,
    JSON.stringify({
      formatVersion: 1,
      auctionSession: {
        id: options.sessionId
      },
      database: {
        fileName
      }
    }),
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
    roots.splice(0).map(
      (root) =>
        rm(root, {
          recursive: true,
          force: true
        })
    )
  );
});

describe(
  "RecoveryPointDeletionService",
  () => {
    it(
      "deletes sqlite and manifest for the matching session recovery point",
      async () => {
        const root =
          await createRoot();

        const recoveryPoint =
          await createRecoveryPoint(
            root,
            {
              sessionId:
                "session-1",
              baseName:
                "SFL92_2026-2027_test_MANUAL-BACKUP"
            }
          );

        const service =
          new RecoveryPointDeletionService({
            backupRoot: root
          });

        await expect(
          service.deleteRecoveryPoint({
            auctionSessionId:
              "session-1",
            fileName:
              recoveryPoint.fileName
          })
        ).resolves.toEqual({
          fileName:
            recoveryPoint.fileName
        });

        await expect(
          readFile(
            recoveryPoint.sqlitePath
          )
        ).rejects.toMatchObject({
          code: "ENOENT"
        });

        await expect(
          readFile(
            recoveryPoint.manifestPath
          )
        ).rejects.toMatchObject({
          code: "ENOENT"
        });
      }
    );

    it(
      "does not delete a recovery point belonging to another session",
      async () => {
        const root =
          await createRoot();

        const recoveryPoint =
          await createRecoveryPoint(
            root,
            {
              sessionId:
                "session-other",
              baseName:
                "SFL92_2026-2027_other_MANUAL-BACKUP"
            }
          );

        const service =
          new RecoveryPointDeletionService({
            backupRoot: root
          });

        await expect(
          service.deleteRecoveryPoint({
            auctionSessionId:
              "session-1",
            fileName:
              recoveryPoint.fileName
          })
        ).rejects.toBeInstanceOf(
          RecoveryPointNotFoundError
        );

        await expect(
          readFile(
            recoveryPoint.sqlitePath,
            "utf8"
          )
        ).resolves.toBe(
          "sqlite-backup"
        );
      }
    );

    it(
      "rejects path traversal input",
      async () => {
        const root =
          await createRoot();

        const outsidePath =
          path.join(
            path.dirname(root),
            "do-not-delete.sqlite"
          );

        await writeFile(
          outsidePath,
          "protected",
          "utf8"
        );

        try {
          const service =
            new RecoveryPointDeletionService({
              backupRoot: root
            });

          await expect(
            service.deleteRecoveryPoint({
              auctionSessionId:
                "session-1",
              fileName:
                "../do-not-delete.sqlite"
            })
          ).rejects.toBeInstanceOf(
            RecoveryPointNotFoundError
          );

          await expect(
            readFile(
              outsidePath,
              "utf8"
            )
          ).resolves.toBe(
            "protected"
          );
        } finally {
          await rm(
            outsidePath,
            {
              force: true
            }
          );
        }
      }
    );

    it(
      "returns not found for an unknown recovery point",
      async () => {
        const root =
          await createRoot();

        const service =
          new RecoveryPointDeletionService({
            backupRoot: root
          });

        await expect(
          service.deleteRecoveryPoint({
            auctionSessionId:
              "session-1",
            fileName:
              "missing.sqlite"
          })
        ).rejects.toBeInstanceOf(
          RecoveryPointNotFoundError
        );
      }
    );

    it(
      "ignores malformed manifests",
      async () => {
        const root =
          await createRoot();

        await mkdir(
          path.join(
            root,
            "broken"
          ),
          {
            recursive: true
          }
        );

        await writeFile(
          path.join(
            root,
            "broken",
            "broken.json"
          ),
          "{not-json",
          "utf8"
        );

        const service =
          new RecoveryPointDeletionService({
            backupRoot: root
          });

        await expect(
          service.deleteRecoveryPoint({
            auctionSessionId:
              "session-1",
            fileName:
              "missing.sqlite"
          })
        ).rejects.toBeInstanceOf(
          RecoveryPointNotFoundError
        );
      }
    );
  }
);
