import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  SqliteAuctionBackupRequester
} from "./sqlite-auction-backup-requester.js";

describe(
  "SqliteAuctionBackupRequester",
  () => {
    it(
      "maps confirmed awards to CONFIRMED_AWARD recovery points",
      async () => {
        const createRecoveryPoint =
          vi.fn(
            async () => ({})
          );

        const requester =
          new SqliteAuctionBackupRequester({
            createRecoveryPoint
          });

        await requester
          .requestConfirmedAwardBackup({
            auctionSessionId:
              "session-1",
            auctionCallId:
              "call-1",
            aggregate:
              {} as never
          });

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledTimes(1);

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1",
          reason:
            "CONFIRMED_AWARD"
        });
      }
    );

    it(
      "maps session suspension to SESSION_SUSPENDED recovery points",
      async () => {
        const createRecoveryPoint =
          vi.fn(
            async () => ({})
          );

        const requester =
          new SqliteAuctionBackupRequester({
            createRecoveryPoint
          });

        await requester
          .requestSuspendedSessionBackup({
            auctionSessionId:
              "session-2"
          });

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledTimes(1);

        expect(
          createRecoveryPoint
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-2",
          reason:
            "SESSION_SUSPENDED"
        });
      }
    );

    it(
      "propagates recovery point failures to the existing coordinator boundary",
      async () => {
        const expectedError =
          new Error(
            "backup failed"
          );

        const requester =
          new SqliteAuctionBackupRequester({
            createRecoveryPoint:
              vi.fn(
                async () => {
                  throw expectedError;
                }
              )
          });

        await expect(
          requester
            .requestSuspendedSessionBackup({
              auctionSessionId:
                "session-3"
            })
        ).rejects.toBe(
          expectedError
        );
      }
    );
  }
);
