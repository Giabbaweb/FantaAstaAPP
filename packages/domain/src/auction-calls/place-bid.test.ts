import { describe, expect, it } from "vitest";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

import {
  PlaceBidDomainError,
  placeBid
} from "./place-bid.js";

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
    currentBid: 1,
    currentLeaderAuctionSessionTeamId: "team-1",
    currentTurnAuctionSessionTeamId: "team-2",
    currentTurnStartedAt: null,
    provisionalWinnerAuctionSessionTeamId: null,
    createdAt: "2026-07-30T20:00:00.000Z",
    updatedAt: "2026-07-30T20:00:00.000Z",
    ...overrides
  };
}

function createTeam(
  auctionSessionTeamId: string,
  turnOrder: number,
  maximumBid: number,
  overrides: Partial<AuctionCallTeam> = {}
): AuctionCallTeam {
  return {
    auctionCallId: "call-1",
    auctionSessionTeamId,
    turnOrder,
    status: "ACTIVE",
    maximumBid,
    exclusionReason: null,
    ...overrides
  };
}

describe("placeBid", () => {
  it("places a valid bid and advances the turn", () => {
    const result = placeBid({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 12)
      ],
      auctionSessionTeamId: "team-2",
      bid: 5
    });

    expect(result.auctionCall).toMatchObject({
      status: "OPEN",
      currentBid: 5,
      currentLeaderAuctionSessionTeamId: "team-2",
      currentTurnAuctionSessionTeamId: "team-3",
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId: null
    });
  });

  it("wraps the turn to the first active team", () => {
    const result = placeBid({
      auctionCall: createAuctionCall({
        currentTurnAuctionSessionTeamId: "team-3"
      }),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 12)
      ],
      auctionSessionTeamId: "team-3",
      bid: 5
    });

    expect(
      result.auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-1");
  });

  it("automatically excludes teams unable to overbid", () => {
    const result = placeBid({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 5),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 6),
        createTeam("team-4", 3, 20)
      ],
      auctionSessionTeamId: "team-2",
      bid: 5
    });

    expect(result.teams[0]).toMatchObject({
      status: "EXCLUDED",
      exclusionReason: "MAXIMUM_BID_TOO_LOW"
    });

    expect(result.teams[2]).toMatchObject({
      status: "ACTIVE",
      exclusionReason: null
    });

    expect(
      result.auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-3");
  });

  it("creates a provisional award when nobody can overbid", () => {
    const result = placeBid({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 5),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 5)
      ],
      auctionSessionTeamId: "team-2",
      bid: 5
    });

    expect(result.auctionCall).toMatchObject({
      status: "PROVISIONAL_AWARD",
      currentBid: 5,
      currentLeaderAuctionSessionTeamId: "team-2",
      currentTurnAuctionSessionTeamId: null,
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId: "team-2"
    });
  });

  it("preserves teams already passed or excluded", () => {
    const result = placeBid({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20, {
          status: "PASSED"
        }),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 20, {
          status: "EXCLUDED",
          exclusionReason: "ROSTER_FULL"
        }),
        createTeam("team-4", 3, 20)
      ],
      auctionSessionTeamId: "team-2",
      bid: 5
    });

    expect(result.teams[0]).toMatchObject({
      status: "PASSED",
      exclusionReason: null
    });

    expect(result.teams[2]).toMatchObject({
      status: "EXCLUDED",
      exclusionReason: "ROSTER_FULL"
    });

    expect(
      result.auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-4");
  });

  it("rejects a bid on a call that is not open", () => {
    expect(() =>
      placeBid({
        auctionCall: createAuctionCall({
          status: "SUSPENDED"
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        auctionSessionTeamId: "team-2",
        bid: 5
      })
    ).toThrowError(
      expect.objectContaining({
        code: "AUCTION_CALL_NOT_OPEN"
      })
    );
  });

  it("rejects a bid from a team outside the current turn", () => {
    expect(() =>
      placeBid({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15),
          createTeam("team-3", 2, 15)
        ],
        auctionSessionTeamId: "team-3",
        bid: 5
      })
    ).toThrowError(
      expect.objectContaining({
        code: "NOT_TEAM_TURN"
      })
    );
  });

  it("rejects a bid from a non-active team", () => {
    expect(() =>
      placeBid({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15, {
            status: "PASSED"
          })
        ],
        auctionSessionTeamId: "team-2",
        bid: 5
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_NOT_ACTIVE"
      })
    );
  });

  it("rejects a bid that is not higher than the current bid", () => {
    expect(() =>
      placeBid({
        auctionCall: createAuctionCall({
          currentBid: 5
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        auctionSessionTeamId: "team-2",
        bid: 5
      })
    ).toThrowError(
      expect.objectContaining({
        code: "BID_NOT_HIGHER"
      })
    );
  });

  it("rejects a bid above the team maximum", () => {
    expect(() =>
      placeBid({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 4)
        ],
        auctionSessionTeamId: "team-2",
        bid: 5
      })
    ).toThrowError(
      expect.objectContaining({
        code: "BID_EXCEEDS_MAXIMUM"
      })
    );
  });

  it("rejects an invalid bid amount", () => {
    expect(() =>
      placeBid({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        auctionSessionTeamId: "team-2",
        bid: 1.5
      })
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_BID"
      })
    );
  });

  it("throws the expected domain error type", () => {
    expect(() =>
      placeBid({
        auctionCall: createAuctionCall({
          status: "SUSPENDED"
        }),
        teams: [],
        auctionSessionTeamId: "team-2",
        bid: 5
      })
    ).toThrow(PlaceBidDomainError);
  });
});
