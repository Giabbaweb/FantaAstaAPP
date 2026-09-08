import {
  describe,
  expect,
  it
} from "vitest";

import {
  AtomicAuctionSessionCommandExecutorError
} from "../realtime/atomic-auction-session-command.executor.js";
import {
  mapAuctionSessionOperationalCommandError
} from "./auction-session-errors.js";

describe(
  "mapAuctionSessionOperationalCommandError",
  () => {
    it.each([
      [
        "AUCTION_SESSION_NOT_FOUND",
        404
      ],
      [
        "STALE_STATE",
        409
      ],
      [
        "COMMAND_ID_CONFLICT",
        409
      ],
      [
        "OPERATIONAL_AUCTION_SESSION_ALREADY_EXISTS",
        409
      ],
      [
        "AUCTION_SESSION_SAVE_FAILED",
        500
      ]
    ] as const)(
      "maps atomic session error %s to HTTP %i",
      (
        code,
        expectedStatusCode
      ) => {
        const error =
          new AtomicAuctionSessionCommandExecutorError(
            code,
            `Test message for ${code}`
          );

        expect(
          mapAuctionSessionOperationalCommandError(
            error
          )
        ).toEqual({
          statusCode:
            expectedStatusCode,
          body: {
            data: null,
            error: {
              code,
              message:
                `Test message for ${code}`
            }
          }
        });
      }
    );

    it("returns null for an unrelated error", () => {
      expect(
        mapAuctionSessionOperationalCommandError(
          new Error("Unrelated")
        )
      ).toBeNull();
    });
  }
);
