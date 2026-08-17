import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  ManualBackupService
} from "./manual-backup.service.js";

describe(
  "ManualBackupService",
  () => {
    it(
      "creates a MANUAL_BACKUP recovery point and returns sanitized metadata",
      async () => {
        const createRecoveryPoint =
          vi.fn(
            async () => ({
              sqlitePath:
                "/secret/backups/example.sqlite",
              manifestPath:
                "/secret/backups/example.json",
              manifest: {
                formatVersion: 1 as const,
                createdAt:
                  "2026-08-17T21:40:00.000Z",
                reason:
                  "MANUAL_BACKUP" as const,
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
                    "SFL92_2026-2027_MANUAL-BACKUP.sqlite",
                  sizeBytes: 208896,
                  latestMigration: {
                    hash:
                      "migration-hash",
                    createdAt:
                      1786834202989
                  }
                },
                integrity: {
                  status:
                    "VALID" as const,
                  messages: [
                    "ok"
                  ]
                },
                timing: {
                  backupDurationMs: 17.3,
                  totalDurationMs: 33
                }
              }
            })
          );

        const service =
          new ManualBackupService({
            createRecoveryPoint
          });

        const result =
          await service.create(
            "session-1",
            {
              name: "Gianfranco",
              role: "ADMINISTRATOR"
            }
          );

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledTimes(1);

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1",
          reason:
            "MANUAL_BACKUP"
        });

        expect(result).toEqual({
          actor: {
            name: "Gianfranco",
            role: "ADMINISTRATOR"
          },
          createdAt:
            "2026-08-17T21:40:00.000Z",
          reason:
            "MANUAL_BACKUP",
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
              "SFL92_2026-2027_MANUAL-BACKUP.sqlite",
            sizeBytes: 208896
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
        });

        expect(
          JSON.stringify(result)
        ).not.toContain(
          "/secret/backups/"
        );
      }
    );

    it(
      "propagates backup failures to the caller",
      async () => {
        const expectedError =
          new Error(
            "manual backup failed"
          );

        const service =
          new ManualBackupService({
            createRecoveryPoint:
              vi.fn(
                async () => {
                  throw expectedError;
                }
              )
          });

        await expect(
          service.create(
            "session-1",
            {
              name: "Auctioneer",
              role: "AUCTIONEER"
            }
          )
        ).rejects.toBe(
          expectedError
        );
      }
    );
  }
);
