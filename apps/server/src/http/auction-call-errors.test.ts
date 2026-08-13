import {
  describe,
  expect,
  it
} from "vitest";

import {
  ConfirmAuctionCallDomainError,
  MaximumBidDomainError,
  RosterEntryDomainError
} from "@fantaastaapp/domain";

import {
  AtomicAuctionCommandExecutorError
} from "../realtime/atomic-auction-command.executor.js";
import {
  ConfirmedAuctionAwardServiceError
} from "../services/confirmed-auction-award.service.js";
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
      "AUCTION_SESSION_SUSPENDED",
      409
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

  it("maps confirm domain errors to conflict", () => {
    const error =
      new ConfirmAuctionCallDomainError(
        "AUCTION_CALL_NOT_PROVISIONALLY_AWARDED",
        "Test confirm conflict"
      );

    expect(
      mapAuctionCallError(error)
    ).toMatchObject({
      statusCode: 409,
      body: {
        error: {
          code:
            "AUCTION_CALL_NOT_PROVISIONALLY_AWARDED"
        }
      }
    });
  });

  it.each([
    [
      "INVALID_ACQUISITION_COST",
      400
    ],
    [
      "ROSTER_ROLE_LIMIT_EXCEEDED",
      409
    ],
    [
      "ROSTER_SIZE_LIMIT_EXCEEDED",
      409
    ],
    [
      "INSUFFICIENT_CREDITS",
      409
    ]
  ] as const)(
    "maps roster error %s to HTTP %i",
    (
      code,
      expectedStatusCode
    ) => {
      const error =
        new RosterEntryDomainError(
          code,
          `Test message for ${code}`
        );

      expect(
        mapAuctionCallError(error)
      ).toMatchObject({
        statusCode:
          expectedStatusCode,
        body: {
          error: {
            code
          }
        }
      });
    }
  );

  it.each([
    [
      "INVALID_REMAINING_CREDITS",
      400
    ],
    [
      "INVALID_REMAINING_ROSTER_SLOTS",
      400
    ],
    [
      "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER",
      409
    ]
  ] as const)(
    "maps maximum bid error %s to HTTP %i",
    (
      code,
      expectedStatusCode
    ) => {
      const error =
        new MaximumBidDomainError(
          code,
          `Test message for ${code}`
        );

      expect(
        mapAuctionCallError(error)
      ).toMatchObject({
        statusCode:
          expectedStatusCode,
        body: {
          error: {
            code
          }
        }
      });
    }
  );

  it.each([
    [
      "WINNER_NOT_FOUND",
      409
    ],
    [
      "PLAYER_NOT_FOUND",
      409
    ],
    [
      "PLAYER_SESSION_MISMATCH",
      409
    ],
    [
      "PLAYER_NOT_AVAILABLE",
      409
    ],
    [
      "PLAYER_ALREADY_ROSTERED",
      409
    ],
    [
      "ROSTER_PLAYER_NOT_FOUND",
      409
    ],
    [
      "WINNER_UPDATE_FAILED",
      500
    ],
    [
      "PLAYER_UPDATE_FAILED",
      500
    ]
  ] as const)(
    "maps confirmed award service error %s to HTTP %i",
    (
      code,
      expectedStatusCode
    ) => {
      const error =
        new ConfirmedAuctionAwardServiceError(
          code,
          `Test message for ${code}`
        );

      expect(
        mapAuctionCallError(error)
      ).toMatchObject({
        statusCode:
          expectedStatusCode,
        body: {
          error: {
            code
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
