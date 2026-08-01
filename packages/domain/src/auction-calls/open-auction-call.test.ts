import { describe, expect, it } from "vitest";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

import {
  OpenAuctionCallDomainError,
  openAuctionCall
} from "./open-auction-call.js";

function createAuctionCall(
  overrides: Partial<AuctionCall> = {}
): AuctionCall {
  return {
    id: "call-1",
    auctionSessionId: "session-1",
    playerId: "player-1",
    callerAuctionSessionTeamId: "team-1",
    status: "DRAFT",
    openingBid: null,
    currentBid: null,
    currentLeaderAuctionSessionTeamId: null,
    currentTurnAuctionSessionTeamId: null,
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

describe("openAuctionCall", () => {
  it("opens the call and gives the turn to the next active team", () => {
    const result = openAuctionCall({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 10)
      ],
      openingBid: 1
    });

    expect(result.auctionCall).toMatchObject({
      status: "OPEN",
      openingBid: 1,
      currentBid: 1,
      currentLeaderAuctionSessionTeamId: "team-1",
      currentTurnAuctionSessionTeamId: "team-2",
      provisionalWinnerAuctionSessionTeamId: null
    });
  });

  it("rotates to the first team after the last caller", () => {
    const result = openAuctionCall({
      auctionCall: createAuctionCall({
        callerAuctionSessionTeamId: "team-3"
      }),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 10)
      ],
      openingBid: 1
    });

    expect(
      result.auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-1");
  });

  it("excludes teams that cannot exceed the opening bid", () => {
    const result = openAuctionCall({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 1),
        createTeam("team-3", 2, 10)
      ],
      openingBid: 1
    });

    expect(result.teams[1]).toMatchObject({
      status: "EXCLUDED",
      exclusionReason: "MAXIMUM_BID_TOO_LOW"
    });

    expect(
      result.auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-3");
  });

  it("creates a provisional award when nobody can raise", () => {
    const result = openAuctionCall({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 1),
        createTeam("team-3", 2, 1)
      ],
      openingBid: 1
    });

    expect(result.auctionCall).toMatchObject({
      status: "PROVISIONAL_AWARD",
      currentTurnAuctionSessionTeamId: null,
      provisionalWinnerAuctionSessionTeamId: "team-1"
    });
  });

  it("rejects a missing caller", () => {
    expect(() =>
      openAuctionCall({
        auctionCall: createAuctionCall({
          callerAuctionSessionTeamId: "missing-team"
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        openingBid: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CALLER_NOT_FOUND"
      })
    );
  });

  it("rejects a caller that is not active", () => {
    expect(() =>
      openAuctionCall({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20, {
            status: "PASSED"
          }),
          createTeam("team-2", 1, 15)
        ],
        openingBid: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CALLER_NOT_ACTIVE"
      })
    );
  });

  it("rejects an opening bid above the caller maximum bid", () => {
    expect(() =>
      openAuctionCall({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 2),
          createTeam("team-2", 1, 15)
        ],
        openingBid: 3
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CALLER_MAXIMUM_BID_TOO_LOW"
      })
    );
  });

  it("rejects duplicate turn orders", () => {
    expect(() =>
      openAuctionCall({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 0, 15)
        ],
        openingBid: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "DUPLICATE_TURN_ORDER"
      })
    );
  });

  it("rejects duplicate auction session teams", () => {
    expect(() =>
      openAuctionCall({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-1", 1, 20)
        ],
        openingBid: 1
      })
    ).toThrowError(
      expect.objectContaining({
        code: "DUPLICATE_AUCTION_SESSION_TEAM"
      })
    );
  });

  it("rejects a call that is not in draft state", () => {
    expect(() =>
      openAuctionCall({
        auctionCall: createAuctionCall({
          status: "OPEN"
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        openingBid: 1
      })
    ).toThrow();
  });

  it("throws the expected opening domain error type", () => {
    expect(() =>
      openAuctionCall({
        auctionCall: createAuctionCall(),
        teams: [createTeam("team-1", 0, 20)],
        openingBid: 1
      })
    ).toThrow(OpenAuctionCallDomainError);
  });
});
