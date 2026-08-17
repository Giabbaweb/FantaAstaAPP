import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  buildApp
} from "../app.js";
import {
  ManualBackupService
} from "../services/manual-backup.service.js";

describe(
  "manual backup routes",
  () => {
    const createRecoveryPoint =
      vi.fn();

    const manualBackupService =
      new ManualBackupService({
        createRecoveryPoint
      });

    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    const successfulRecoveryPoint = {
      sqlitePath:
        "/secret/backups/manual.sqlite",
      manifestPath:
        "/secret/backups/manual.json",
      manifest: {
        formatVersion: 1 as const,
        createdAt:
          "2026-08-17T21:45:00.000Z",
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
    };

    beforeAll(async () => {
      app = await buildApp({
        manualBackupService
      });
    });

    beforeEach(() => {
      createRecoveryPoint
        .mockReset();

      createRecoveryPoint
        .mockResolvedValue(
          successfulRecoveryPoint
        );
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "creates a manual backup for an administrator",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/manual",
            payload: {
              actor: {
                name: "Gianfranco",
                role: "ADMINISTRATOR"
              }
            }
          });

        expect(response.statusCode)
          .toBe(200);

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1",
          reason:
            "MANUAL_BACKUP"
        });

        expect(response.json())
          .toEqual({
            data: {
              actor: {
                name: "Gianfranco",
                role: "ADMINISTRATOR"
              },
              createdAt:
                "2026-08-17T21:45:00.000Z",
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
            },
            error: null
          });

        expect(
          response.body
        ).not.toContain(
          "/secret/backups/"
        );
      }
    );

    it(
      "allows an auctioneer to create a manual backup",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/manual",
            payload: {
              actor: {
                name: "Banditore",
                role: "AUCTIONEER"
              }
            }
          });

        expect(response.statusCode)
          .toBe(200);

        expect(response.json().data.actor)
          .toEqual({
            name: "Banditore",
            role: "AUCTIONEER"
          });
      }
    );

    it(
      "rejects an invalid actor role",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/manual",
            payload: {
              actor: {
                name: "Observer",
                role: "OBSERVER"
              }
            }
          });

        expect(response.statusCode)
          .toBe(400);

        expect(
          createRecoveryPoint
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 404 when the auction session does not exist",
      async () => {
        createRecoveryPoint
          .mockRejectedValueOnce(
            new Error(
              "Auction session not found for backup: missing-session"
            )
          );

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "missing-session/backups/manual",
            payload: {
              actor: {
                name: "Administrator",
                role: "ADMINISTRATOR"
              }
            }
          });

        expect(response.statusCode)
          .toBe(404);

        expect(response.json())
          .toEqual({
            data: null,
            error: {
              code:
                "AUCTION_SESSION_NOT_FOUND",
              message:
                "Auction session not found"
            }
          });
      }
    );

    it(
      "returns an error instead of a false success when manual backup fails",
      async () => {
        createRecoveryPoint
          .mockRejectedValueOnce(
            new Error(
              "disk write failed"
            )
          );

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/manual",
            payload: {
              actor: {
                name: "Administrator",
                role: "ADMINISTRATOR"
              }
            }
          });

        expect(response.statusCode)
          .toBe(500);

        expect(response.json())
          .toEqual({
            data: null,
            error: {
              code:
                "MANUAL_BACKUP_FAILED",
              message:
                "Manual backup failed"
            }
          });
      }
    );
  }
);
