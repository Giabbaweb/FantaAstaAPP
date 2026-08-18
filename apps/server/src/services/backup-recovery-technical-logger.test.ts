import {
  mkdtemp,
  readFile,
  rm
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
  BackupRecoveryTechnicalLogger
} from "./backup-recovery-technical-logger.js";

const roots: string[] = [];

async function createRoot() {
  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        "fantaasta-technical-log-"
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
  "BackupRecoveryTechnicalLogger",
  () => {
    it(
      "writes structured JSON lines to the technical log",
      async () => {
        const root =
          await createRoot();

        const logger =
          await BackupRecoveryTechnicalLogger
            .create({
              logsRoot:
                root
            });

        logger.info({
          event:
            "BACKUP_COMPLETED",
          auctionSessionId:
            "session-1",
          leagueId:
            "league-1",
          reason:
            "MANUAL_BACKUP",
          fileName:
            "backup.sqlite",
          sizeBytes:
            208896,
          durationMs:
            32.4,
          integrity:
            "VALID"
        });

        logger.flush();

        const contents =
          await readFile(
            logger.logPath,
            "utf8"
          );

        const lines =
          contents
            .trim()
            .split("\n");

        expect(lines)
          .toHaveLength(1);

        const parsed =
          JSON.parse(
            lines[0]!
          ) as Record<
            string,
            unknown
          >;

        expect(parsed)
          .toEqual(
            expect.objectContaining({
              module:
                "backup-recovery",
              event:
                "BACKUP_COMPLETED",
              auctionSessionId:
                "session-1",
              leagueId:
                "league-1",
              reason:
                "MANUAL_BACKUP",
              fileName:
                "backup.sqlite",
              sizeBytes:
                208896,
              integrity:
                "VALID"
            })
          );

        expect(
          typeof parsed.time
        ).toBe("string");
      }
    );

    it(
      "appends multiple events instead of overwriting the file",
      async () => {
        const root =
          await createRoot();

        const logger =
          await BackupRecoveryTechnicalLogger
            .create({
              logsRoot:
                root
            });

        logger.info({
          event:
            "BACKUP_STARTED",
          auctionSessionId:
            "session-1"
        });

        logger.info({
          event:
            "BACKUP_COMPLETED",
          auctionSessionId:
            "session-1"
        });

        logger.flush();

        const contents =
          await readFile(
            logger.logPath,
            "utf8"
          );

        expect(
          contents
            .trim()
            .split("\n")
        ).toHaveLength(2);
      }
    );

    it(
      "serializes errors safely",
      async () => {
        const root =
          await createRoot();

        const logger =
          await BackupRecoveryTechnicalLogger
            .create({
              logsRoot:
                root
            });

        const error =
          Object.assign(
            new Error(
              "disk full"
            ),
            {
              code:
                "ENOSPC"
            }
          );

        logger.error({
          event:
            "BACKUP_FAILED",
          auctionSessionId:
            "session-1",
          error
        });

        logger.flush();

        const contents =
          await readFile(
            logger.logPath,
            "utf8"
          );

        const parsed =
          JSON.parse(
            contents.trim()
          ) as {
            error: {
              name?: string;
              message: string;
              code?: string;
            };
          };

        expect(parsed.error)
          .toEqual({
            name:
              "Error",
            message:
              "disk full",
            code:
              "ENOSPC"
          });
      }
    );

    it(
      "creates the log directory when missing",
      async () => {
        const root =
          await createRoot();

        const logsRoot =
          path.join(
            root,
            "nested",
            "logs"
          );

        const logger =
          await BackupRecoveryTechnicalLogger
            .create({
              logsRoot
            });

        logger.info({
          event:
            "STARTUP_RECOVERY"
        });

        logger.flush();

        await expect(
          readFile(
            logger.logPath,
            "utf8"
          )
        ).resolves.toContain(
          "STARTUP_RECOVERY"
        );
      }
    );
  }
);
