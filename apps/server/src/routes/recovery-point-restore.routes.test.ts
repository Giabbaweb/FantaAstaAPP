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
  RecoveryPointRestoreError
} from "../services/recovery-point-restore.service.js";
import {
  RestoreAlreadyScheduledError
} from "../services/restore-runtime-coordinator.js";

describe(
  "recovery point restore routes",
  () => {
    const prepareRestore =
      vi.fn();

    const prepareAndSchedule =
      vi.fn();

    const markResponseFlushed =
      vi.fn();

    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    const prepared = {
      auctionSessionId:
        "session-1",
      fileName:
        "backup.sqlite",
      sourcePath:
        "/backups/backup.sqlite",
      candidatePath:
        "/data/fantaasta.sqlite.restore-candidate"
    };

    beforeAll(async () => {
      app = await buildApp({
        recoveryPointRestoreService: {
          prepareRestore
        },
        restoreRuntimeCoordinator: {
          prepareAndSchedule,
          markResponseFlushed
        }
      });
    });

    beforeEach(() => {
      prepareRestore
        .mockReset();

      prepareAndSchedule
        .mockReset();

      markResponseFlushed
        .mockReset();

      prepareRestore
        .mockResolvedValue(
          prepared
        );

      prepareAndSchedule
        .mockImplementation(
          async (
            prepare:
              () =>
                Promise<
                  typeof prepared
                >
          ) =>
            prepare()
        );
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "prepares restore for an administrator and wakes runtime after response",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "backup.sqlite/restore",
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
          prepareRestore
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1",
          fileName:
            "backup.sqlite"
        });

        expect(response.json())
          .toEqual({
            data: {
              status:
                "RESTORE_PREPARED",
              auctionSessionId:
                "session-1",
              fileName:
                "backup.sqlite",
              restartRequired:
                true
            },
            error: null
          });

        expect(
          markResponseFlushed
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "rejects an auctioneer",
      async () => {
        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "backup.sqlite/restore",
            payload: {
              actor: {
                name: "Banditore",
                role: "AUCTIONEER"
              }
            }
          });

        expect(response.statusCode)
          .toBe(400);

        expect(
          prepareAndSchedule
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 409 when another restore is already pending",
      async () => {
        prepareAndSchedule
          .mockRejectedValueOnce(
            new RestoreAlreadyScheduledError()
          );

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "backup.sqlite/restore",
            payload: {
              actor: {
                name: "Administrator",
                role: "ADMINISTRATOR"
              }
            }
          });

        expect(response.statusCode)
          .toBe(409);

        expect(response.json())
          .toEqual({
            data: null,
            error: {
              code:
                "RESTORE_ALREADY_SCHEDULED",
              message:
                "A recovery point restore is already scheduled"
            }
          });
      }
    );

    it(
      "maps a non-suspended session to 409",
      async () => {
        prepareRestore
          .mockRejectedValueOnce(
            new RecoveryPointRestoreError(
              "AUCTION_SESSION_NOT_SUSPENDED",
              "Auction session must be suspended before restore"
            )
          );

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "backup.sqlite/restore",
            payload: {
              actor: {
                name: "Administrator",
                role: "ADMINISTRATOR"
              }
            }
          });

        expect(response.statusCode)
          .toBe(409);

        expect(
          response.json().error.code
        ).toBe(
          "AUCTION_SESSION_NOT_SUSPENDED"
        );
      }
    );

    it(
      "maps an unknown recovery point to 404",
      async () => {
        prepareRestore
          .mockRejectedValueOnce(
            new RecoveryPointRestoreError(
              "RECOVERY_POINT_NOT_FOUND",
              "Recovery point not found"
            )
          );

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "missing.sqlite/restore",
            payload: {
              actor: {
                name: "Administrator",
                role: "ADMINISTRATOR"
              }
            }
          });

        expect(response.statusCode)
          .toBe(404);
      }
    );
  }
);
