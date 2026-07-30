import { describe, expect, it } from "vitest";

import {
  MaximumBidDomainError,
  calculateMaximumBid
} from "./maximum-bid.js";

describe("calculateMaximumBid", () => {
  it("calculates the maximum sustainable bid", () => {
    expect(
      calculateMaximumBid({
        remainingCredits: 100,
        remainingRosterSlots: 10
      })
    ).toBe(91);
  });

  it("returns one when credits exactly cover remaining slots", () => {
    expect(
      calculateMaximumBid({
        remainingCredits: 10,
        remainingRosterSlots: 10
      })
    ).toBe(1);
  });

  it("rejects invalid remaining credits", () => {
    expect(() =>
      calculateMaximumBid({
        remainingCredits: -1,
        remainingRosterSlots: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_REMAINING_CREDITS"
      })
    );
  });

  it("rejects invalid remaining roster slots", () => {
    expect(() =>
      calculateMaximumBid({
        remainingCredits: 10,
        remainingRosterSlots: 0
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_REMAINING_ROSTER_SLOTS"
      })
    );
  });

  it("rejects a state that cannot complete the roster", () => {
    expect(() =>
      calculateMaximumBid({
        remainingCredits: 9,
        remainingRosterSlots: 10
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
      })
    );
  });

  it("throws the expected domain error type", () => {
    expect(() =>
      calculateMaximumBid({
        remainingCredits: 0,
        remainingRosterSlots: 1
      })
    ).toThrow(MaximumBidDomainError);
  });
});
