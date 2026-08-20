import { describe, expect, it } from "vitest";

import {
  ConfirmAuctionCallDomainError,
  confirmAuctionCall
} from "./confirm-auction-call.js";

import type { AuctionCall } from "./auction-call.js";

function createAuctionCall(
  overrides: Partial<AuctionCall> = {}
): AuctionCall {
  return {
    id: "call-1",
    auctionSessionId: "session-1",
    playerId: "player-1",
    callerAuctionSessionTeamId: "team-1",
    status: "PROVISIONAL_AWARD",
    openingBid: 1,
    currentBid: 5,
    currentLeaderAuctionSessionTeamId: "team-2",
    currentTurnAuctionSessionTeamId: null,
    currentTurnStartedAt: null,
    provisionalWinnerAuctionSessionTeamId: "team-2",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    ...overrides
  };
}

describe("confirmAuctionCall", () => {
  it("confirms a provisional award", () => {
    const result = confirmAuctionCall({
      auctionCall: createAuctionCall()
    });

    expect(result.auctionCall).toMatchObject({
      status: "CONFIRMED",
      currentBid: 5,
      currentLeaderAuctionSessionTeamId: "team-2",
      currentTurnAuctionSessionTeamId: null,
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId: "team-2"
    });
  });

  it("does not mutate the original auction call", () => {
    const auctionCall = createAuctionCall();

    confirmAuctionCall({ auctionCall });

    expect(auctionCall.status).toBe(
      "PROVISIONAL_AWARD"
    );
  });

  it("rejects a call that is not provisionally awarded", () => {
    expect(() =>
      confirmAuctionCall({
        auctionCall: createAuctionCall({
          status: "OPEN"
        })
      })
    ).toThrowError(
      expect.objectContaining({
        code: "AUCTION_CALL_NOT_PROVISIONALLY_AWARDED"
      })
    );
  });

  it("rejects a call without current bid", () => {
    expect(() =>
      confirmAuctionCall({
        auctionCall: createAuctionCall({
          currentBid: null
        })
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CURRENT_BID_NOT_SET"
      })
    );
  });

  it("rejects a call without current leader", () => {
    expect(() =>
      confirmAuctionCall({
        auctionCall: createAuctionCall({
          currentLeaderAuctionSessionTeamId: null
        })
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CURRENT_LEADER_NOT_SET"
      })
    );
  });

  it("rejects a call without provisional winner", () => {
    expect(() =>
      confirmAuctionCall({
        auctionCall: createAuctionCall({
          provisionalWinnerAuctionSessionTeamId: null
        })
      })
    ).toThrowError(
      expect.objectContaining({
        code: "PROVISIONAL_WINNER_NOT_SET"
      })
    );
  });

  it("rejects a provisional winner different from the leader", () => {
    expect(() =>
      confirmAuctionCall({
        auctionCall: createAuctionCall({
          provisionalWinnerAuctionSessionTeamId:
            "team-3"
        })
      })
    ).toThrowError(
      expect.objectContaining({
        code: "PROVISIONAL_WINNER_MISMATCH"
      })
    );
  });

  it("throws the expected domain error type", () => {
    expect(() =>
      confirmAuctionCall({
        auctionCall: createAuctionCall({
          status: "CONFIRMED"
        })
      })
    ).toThrow(ConfirmAuctionCallDomainError);
  });
});
