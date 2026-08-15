import {
  describe,
  expect,
  it
} from "vitest";

import {
  AuctionSessionDomainError,
  transitionAuctionSessionStatus
} from "./auction-session.js";

describe("auction session status transitions", () => {
  it("reopens a closed session as completed", () => {
    expect(
      transitionAuctionSessionStatus(
        "CLOSED",
        "reopen"
      )
    ).toBe("COMPLETED");
  });

  it("does not reopen a completed session", () => {
    expect(() =>
      transitionAuctionSessionStatus(
        "COMPLETED",
        "reopen"
      )
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_STATUS_TRANSITION"
      })
    );
  });

  it("throws the expected domain error type", () => {
    expect(() =>
      transitionAuctionSessionStatus(
        "COMPLETED",
        "reopen"
      )
    ).toThrow(AuctionSessionDomainError);
  });
});
