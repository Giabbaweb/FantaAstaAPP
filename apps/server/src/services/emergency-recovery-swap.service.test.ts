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
  EmergencyRecoverySwapError,
  EmergencyRecoverySwapService
} from "./emergency-recovery-swap.service.js";

const roots: string[] = [];

async function createRoot() {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-emergency-swap-"
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
  "EmergencyRecoverySwapService",
  () => {
    it(
      "preserves the damaged database and installs the candidate",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const candidatePath =
          `${databasePath}.emergency-restore-candidate`;

        await writeFile(
          databasePath,
          "DAMAGED",
          "utf8"
        );

        await writeFile(
          candidatePath,
          "RESTORED",
          "utf8"
        );

        const service =
          new EmergencyRecoverySwapService({
            now:
              () =>
                new Date(
                  "2026-08-18T20:15:30.123Z"
                )
          });

        const result =
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
          "RESTORED"
        );

        expect(
          result.preservedDatabasePath
        ).toBe(
          `${databasePath}.emergency-damaged-2026-08-18_20-15-30-123Z`
        );

        await expect(
          readFile(
            result.preservedDatabasePath!,
            "utf8"
          )
        ).resolves.toBe(
          "DAMAGED"
        );
      }
    );

    it(
      "preserves WAL and SHM sidecars",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const candidatePath =
          `${databasePath}.emergency-restore-candidate`;

        await writeFile(
          databasePath,
          "DAMAGED",
          "utf8"
        );

        await writeFile(
          `${databasePath}-wal`,
          "WAL",
          "utf8"
        );

        await writeFile(
          `${databasePath}-shm`,
          "SHM",
          "utf8"
        );

        await writeFile(
          candidatePath,
          "RESTORED",
          "utf8"
        );

        const service =
          new EmergencyRecoverySwapService({
            now:
              () =>
                new Date(
                  "2026-08-18T20:15:30.123Z"
                )
          });

        const result =
          await service.commitSwap({
            databasePath,
            candidatePath
          });

        await expect(
          readFile(
            result.preservedWalPath!,
            "utf8"
          )
        ).resolves.toBe(
          "WAL"
        );

        await expect(
          readFile(
            result.preservedShmPath!,
            "utf8"
          )
        ).resolves.toBe(
          "SHM"
        );
      }
    );

    it(
      "works when the live database does not exist",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const candidatePath =
          `${databasePath}.emergency-restore-candidate`;

        await writeFile(
          candidatePath,
          "RESTORED",
          "utf8"
        );

        const service =
          new EmergencyRecoverySwapService();

        const result =
          await service.commitSwap({
            databasePath,
            candidatePath
          });

        expect(
          result.preservedDatabasePath
        ).toBeNull();

        await expect(
          readFile(
            databasePath,
            "utf8"
          )
        ).resolves.toBe(
          "RESTORED"
        );
      }
    );

    it(
      "rejects a missing candidate without touching the live database",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        await writeFile(
          databasePath,
          "DAMAGED",
          "utf8"
        );

        const service =
          new EmergencyRecoverySwapService();

        await expect(
          service.commitSwap({
            databasePath,
            candidatePath:
              `${databasePath}.missing`
          })
        ).rejects.toBeInstanceOf(
          EmergencyRecoverySwapError
        );

        await expect(
          readFile(
            databasePath,
            "utf8"
          )
        ).resolves.toBe(
          "DAMAGED"
        );
      }
    );

    it(
      "removes the candidate path after a successful install",
      async () => {
        const root =
          await createRoot();

        const databasePath =
          path.join(
            root,
            "live.sqlite"
          );

        const candidatePath =
          `${databasePath}.emergency-restore-candidate`;

        await writeFile(
          candidatePath,
          "RESTORED",
          "utf8"
        );

        const service =
          new EmergencyRecoverySwapService();

        await service.commitSwap({
          databasePath,
          candidatePath
        });

        await expect(
          stat(candidatePath)
        ).rejects.toMatchObject({
          code:
            "ENOENT"
        });
      }
    );
  }
);
