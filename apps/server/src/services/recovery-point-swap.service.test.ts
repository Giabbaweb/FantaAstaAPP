import {
  mkdtemp,
  readFile,
  rm,
  stat,
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
  RecoveryPointSwapError,
  RecoveryPointSwapService
} from "./recovery-point-swap.service.js";

const roots: string[] = [];

async function createRoot() {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-swap-"
      )
    );

  roots.push(root);

  return root;
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
  "RecoveryPointSwapService",
  () => {
    it(
      "replaces the live database with the prepared candidate",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "fantaasta.sqlite"
          );

        const candidatePath =
          `${databasePath}.restore-candidate`;

        await writeFile(
          databasePath,
          "old-database",
          "utf8"
        );

        await writeFile(
          candidatePath,
          "restored-database",
          "utf8"
        );

        const service =
          new RecoveryPointSwapService();

        await expect(
          service.commitSwap({
            databasePath,
            candidatePath
          })
        ).resolves.toEqual({
          databasePath
        });

        await expect(
          readFile(
            databasePath,
            "utf8"
          )
        ).resolves.toBe(
          "restored-database"
        );

        await expect(
          stat(candidatePath)
        ).rejects.toMatchObject({
          code: "ENOENT"
        });

        await expect(
          stat(
            `${databasePath}.pre-swap`
          )
        ).rejects.toMatchObject({
          code: "ENOENT"
        });
      }
    );

    it(
      "removes stale WAL and SHM sidecars",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "fantaasta.sqlite"
          );

        const candidatePath =
          `${databasePath}.restore-candidate`;

        await writeFile(
          databasePath,
          "old",
          "utf8"
        );

        await writeFile(
          `${databasePath}-wal`,
          "wal",
          "utf8"
        );

        await writeFile(
          `${databasePath}-shm`,
          "shm",
          "utf8"
        );

        await writeFile(
          candidatePath,
          "new",
          "utf8"
        );

        const service =
          new RecoveryPointSwapService();

        await service.commitSwap({
          databasePath,
          candidatePath
        });

        await expect(
          stat(
            `${databasePath}-wal`
          )
        ).rejects.toMatchObject({
          code: "ENOENT"
        });

        await expect(
          stat(
            `${databasePath}-shm`
          )
        ).rejects.toMatchObject({
          code: "ENOENT"
        });
      }
    );

    it(
      "rejects a missing restore candidate",
      async () => {
        const root =
          await createRoot();

        const service =
          new RecoveryPointSwapService();

        await expect(
          service.commitSwap({
            databasePath:
              path.join(
                root,
                "fantaasta.sqlite"
              ),
            candidatePath:
              path.join(
                root,
                "missing.restore-candidate"
              )
          })
        ).rejects.toBeInstanceOf(
          RecoveryPointSwapError
        );
      }
    );

    it(
      "can install a candidate when no live database exists",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "fantaasta.sqlite"
          );

        const candidatePath =
          `${databasePath}.restore-candidate`;

        await writeFile(
          candidatePath,
          "candidate-only",
          "utf8"
        );

        const service =
          new RecoveryPointSwapService();

        await service.commitSwap({
          databasePath,
          candidatePath
        });

        await expect(
          readFile(
            databasePath,
            "utf8"
          )
        ).resolves.toBe(
          "candidate-only"
        );
      }
    );
  }
);
