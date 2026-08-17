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
  RecoveryPointNotFoundError
} from "../services/recovery-point-deletion.service.js";

describe(
  "recovery point deletion routes",
  () => {
    const deleteRecoveryPoint =
      vi.fn();

    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp({
        recoveryPointDeletionService: {
          deleteRecoveryPoint
        }
      });
    });

    beforeEach(() => {
      deleteRecoveryPoint
        .mockReset();

      deleteRecoveryPoint
        .mockResolvedValue({
          fileName:
            "SFL92_2026-2027_test_MANUAL-BACKUP.sqlite"
        });
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "allows an administrator to delete a recovery point",
      async () => {
        const fileName =
          "SFL92_2026-2027_test_MANUAL-BACKUP.sqlite";

        const response =
          await app.inject({
            method: "DELETE",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              encodeURIComponent(
                fileName
              ),
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
          deleteRecoveryPoint
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1",
          fileName
        });

        expect(response.json())
          .toEqual({
            data: {
              fileName
            },
            error: null
          });
      }
    );

    it(
      "rejects an auctioneer",
      async () => {
        const response =
          await app.inject({
            method: "DELETE",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "backup.sqlite",
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
          deleteRecoveryPoint
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an invalid payload",
      async () => {
        const response =
          await app.inject({
            method: "DELETE",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "backup.sqlite",
            payload: {}
          });

        expect(response.statusCode)
          .toBe(400);

        expect(
          deleteRecoveryPoint
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 404 for an unknown recovery point",
      async () => {
        deleteRecoveryPoint
          .mockRejectedValueOnce(
            new RecoveryPointNotFoundError()
          );

        const response =
          await app.inject({
            method: "DELETE",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "missing.sqlite",
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
                "RECOVERY_POINT_NOT_FOUND",
              message:
                "Recovery point not found"
            }
          });
      }
    );

    it(
      "returns 500 when deletion fails",
      async () => {
        deleteRecoveryPoint
          .mockRejectedValueOnce(
            new Error(
              "filesystem failure"
            )
          );

        const response =
          await app.inject({
            method: "DELETE",
            url:
              "/api/auction-sessions/" +
              "session-1/backups/" +
              "backup.sqlite",
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
                "RECOVERY_POINT_DELETE_FAILED",
              message:
                "Recovery point could not be deleted"
            }
          });
      }
    );
  }
);
