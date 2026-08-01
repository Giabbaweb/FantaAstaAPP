import { describe, expect, it } from "vitest";

import {
  CancelAuctionCallDomainError,
  cancelAuctionCall
} from "./cancel-auction-call.js";

import type { AuctionCall } from "./auction-call.js";

function createAuctionCall(
  overrides: Partial<AuctionCall> = {}
): AuctionCall {
  return {
    id: "call-1",
    auctionSessionId: "session-1",
    playerId: "player-1",
    callerAuctionSessionTeamId: "team-1",
    status: "OPEN",
    openingBid: 1,
    currentBid: 5,
    currentLeaderAuctionSessionTeamId: "team-2",
    currentTurnAuctionSessionTeamId: "team-3",
    provisionalWinnerAuctionSessionTeamId: null,
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    ...overrides
  };
}

describe("cancelAuctionCall", () => {
  it.each([
    "DRAFT",
    "OPEN",
    "SUSPENDED"
  ] as const)(
    "cancels an auction call from %s",
    (status) => {
      const result = cancelAuctionCall({
        auctionCall: createAuctionCall({ status })
      });

      expect(result.auctionCall).toMatchObject({
        status: "CANCELLED",
        currentTurnAuctionSessionTeamId: null,
        provisionalWinnerAuctionSessionTeamId: null
      });
    }
  );

  it("does not mutate the original auction call", () => {
    const auctionCall = createAuctionCall();

    cancelAuctionCall({ auctionCall });

    expect(auctionCall.status).toBe("OPEN");
  });

  it.each([
    "PROVISIONAL_AWARD",
    "CONFIRMED",
    "CANCELLED",
    "ROLLED_BACK"
  ] as const)(
    "rejects cancellation from %s",
    (status) => {
      expect(() =>
        cancelAuctionCall({
          auctionCall: createAuctionCall({ status })
        })
      ).toThrowError(
        expect.objectContaining({
          code: "AUCTION_CALL_NOT_CANCELLABLE"
        })
      );
    }
  );

  it("throws the expected domain error type", () => {
    expect(() =>
      cancelAuctionCall({
        auctionCall: createAuctionCall({
          status: "CONFIRMED"
        })
      })
    ).toThrow(CancelAuctionCallDomainError);
  });
});
