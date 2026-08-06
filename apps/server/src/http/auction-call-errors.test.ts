import {
  describe,
  expect,
  it
} from "vitest";

import {
  AtomicAuctionCommandExecutorError
} from "../realtime/atomic-auction-command.executor.js";
import {
  mapAuctionCallError
} from "./auction-call-errors.js";

describe("mapAuctionCallError", () => {
  it.each([
    [
      "AUCTION_CALL_NOT_FOUND",
      404
    ],
    [
      "AUCTION_SESSION_STATE_NOT_FOUND",
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
      "AUCTION_CALL_SAVE_FAILED",
      500
    ]
  ] as const)(
    "maps atomic error %s to HTTP %i",
    (
      code,
      expectedStatusCode
    ) => {
      const error =
        new AtomicAuctionCommandExecutorError(
          code,
          `Test message for ${code}`
        );

      expect(
        mapAuctionCallError(error)
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
      mapAuctionCallError(
        new Error("Unrelated")
      )
    ).toBeNull();
  });
});
