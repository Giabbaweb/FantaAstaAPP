import { describe, expect, it } from "vitest";

import {
  MaximumBidDomainError
} from "./maximum-bid.js";
import {
  assertConfirmedAuctionAwardAllowed
} from "./confirmed-auction-award.js";

describe("assertConfirmedAuctionAwardAllowed", () => {
  it("allows a sustainable confirmed award", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "A",
        currentRosterSize: 10,
        currentRoleCount: 2,
        remainingCredits: 100,
        acquisitionCost: 50
      })
    ).not.toThrow();
  });

  it("allows the maximum sustainable acquisition cost", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "A",
        currentRosterSize: 14,
        currentRoleCount: 3,
        remainingCredits: 20,
        acquisitionCost: 11
      })
    ).not.toThrow();
  });

  it("rejects an acquisition above the maximum sustainable cost", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "A",
        currentRosterSize: 14,
        currentRoleCount: 3,
        remainingCredits: 20,
        acquisitionCost: 12
      })
    ).toThrowError(
      expect.objectContaining({
        code:
          "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
      })
    );
  });

  it("rejects an acquisition above remaining credits", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "A",
        currentRosterSize: 23,
        currentRoleCount: 5,
        remainingCredits: 5,
        acquisitionCost: 6
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INSUFFICIENT_CREDITS"
      })
    );
  });

  it("rejects a full roster", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "A",
        currentRosterSize: 24,
        currentRoleCount: 5,
        remainingCredits: 20,
        acquisitionCost: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "ROSTER_SIZE_LIMIT_EXCEEDED"
      })
    );
  });

  it("rejects a full role slot", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "P",
        currentRosterSize: 10,
        currentRoleCount: 2,
        remainingCredits: 100,
        acquisitionCost: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "ROSTER_ROLE_LIMIT_EXCEEDED"
      })
    );
  });

  it("rejects an invalid acquisition cost", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "C",
        currentRosterSize: 10,
        currentRoleCount: 3,
        remainingCredits: 100,
        acquisitionCost: 0
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_ACQUISITION_COST"
      })
    );
  });

  it("throws the maximum bid domain error for an unsustainable award", () => {
    expect(() =>
      assertConfirmedAuctionAwardAllowed({
        playerRole: "D",
        currentRosterSize: 14,
        currentRoleCount: 4,
        remainingCredits: 20,
        acquisitionCost: 12
      })
    ).toThrow(MaximumBidDomainError);
  });
});
