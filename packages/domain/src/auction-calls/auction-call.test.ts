import { describe, expect, it } from "vitest";

import {
  AuctionCallDomainError,
  transitionAuctionCallStatus
} from "./auction-call.js";

describe("transitionAuctionCallStatus", () => {
  it("reopens a provisional award", () => {
    expect(
      transitionAuctionCallStatus(
        "PROVISIONAL_AWARD",
        "reopen"
      )
    ).toBe("OPEN");
  });

  it("does not reopen an open call", () => {
    expect(() =>
      transitionAuctionCallStatus(
        "OPEN",
        "reopen"
      )
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_STATUS_TRANSITION"
      })
    );
  });

  it("does not reopen a confirmed call", () => {
    expect(() =>
      transitionAuctionCallStatus(
        "CONFIRMED",
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
      transitionAuctionCallStatus(
        "CONFIRMED",
        "reopen"
      )
    ).toThrow(AuctionCallDomainError);
  });
});
