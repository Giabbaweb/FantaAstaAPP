import { describe, expect, it } from "vitest";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

import {
  PassTurnDomainError,
  passTurn
} from "./pass-turn.js";

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

describe("passTurn", () => {
  it("marks the current team as passed and advances the turn", () => {
    const result = passTurn({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 12)
      ],
      auctionSessionTeamId: "team-2"
    });

    expect(result.teams[1]).toMatchObject({
      status: "PASSED",
      exclusionReason: null
    });

    expect(result.auctionCall).toMatchObject({
      status: "OPEN",
      currentTurnAuctionSessionTeamId: "team-3",
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId: null
    });
  });

  it("wraps the turn to the first active team", () => {
    const result = passTurn({
      auctionCall: createAuctionCall({
        currentLeaderAuctionSessionTeamId: "team-2",
        currentTurnAuctionSessionTeamId: "team-3"
      }),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 20),
        createTeam("team-3", 2, 20)
      ],
      auctionSessionTeamId: "team-3"
    });

    expect(
      result.auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-1");
  });

  it("skips teams already passed or excluded", () => {
    const result = passTurn({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 20, {
          status: "PASSED"
        }),
        createTeam("team-4", 3, 20, {
          status: "EXCLUDED",
          exclusionReason: "ROSTER_FULL"
        }),
        createTeam("team-5", 4, 20)
      ],
      auctionSessionTeamId: "team-2"
    });

    expect(
      result.auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-5");
  });

  it("does not return the current leader as the next bidder", () => {
    const result = passTurn({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 20, {
          status: "PASSED"
        })
      ],
      auctionSessionTeamId: "team-2"
    });

    expect(result.auctionCall).toMatchObject({
      status: "PROVISIONAL_AWARD",
      currentTurnAuctionSessionTeamId: null,
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId: "team-1"
    });
  });

  it("creates a provisional award when no challenger remains", () => {
    const result = passTurn({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 20, {
          status: "EXCLUDED",
          exclusionReason: "MAXIMUM_BID_TOO_LOW"
        })
      ],
      auctionSessionTeamId: "team-2"
    });

    expect(result.auctionCall).toMatchObject({
      status: "PROVISIONAL_AWARD",
      currentBid: 5,
      currentLeaderAuctionSessionTeamId: "team-1",
      currentTurnAuctionSessionTeamId: null,
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId: "team-1"
    });
  });

  it("preserves teams already passed or excluded", () => {
    const result = passTurn({
      auctionCall: createAuctionCall(),
      teams: [
        createTeam("team-1", 0, 20),
        createTeam("team-2", 1, 15),
        createTeam("team-3", 2, 20, {
          status: "EXCLUDED",
          exclusionReason: "ROLE_LIMIT_REACHED"
        }),
        createTeam("team-4", 3, 20)
      ],
      auctionSessionTeamId: "team-2"
    });

    expect(result.teams[2]).toMatchObject({
      status: "EXCLUDED",
      exclusionReason: "ROLE_LIMIT_REACHED"
    });
  });

  it("rejects passing on a call that is not open", () => {
    expect(() =>
      passTurn({
        auctionCall: createAuctionCall({
          status: "SUSPENDED"
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "AUCTION_CALL_NOT_OPEN"
      })
    );
  });

  it("rejects passing when the current turn is missing", () => {
    expect(() =>
      passTurn({
        auctionCall: createAuctionCall({
          currentTurnAuctionSessionTeamId: null
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CURRENT_TURN_NOT_SET"
      })
    );
  });

  it("rejects passing when the current leader is missing", () => {
    expect(() =>
      passTurn({
        auctionCall: createAuctionCall({
          currentLeaderAuctionSessionTeamId: null
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CURRENT_LEADER_NOT_SET"
      })
    );
  });

  it("rejects passing from a team outside the current turn", () => {
    expect(() =>
      passTurn({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15),
          createTeam("team-3", 2, 15)
        ],
        auctionSessionTeamId: "team-3"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "NOT_TEAM_TURN"
      })
    );
  });

  it("rejects passing from a non-active team", () => {
    expect(() =>
      passTurn({
        auctionCall: createAuctionCall(),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15, {
            status: "PASSED"
          })
        ],
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_NOT_ACTIVE"
      })
    );
  });

  it("rejects a team not belonging to the call", () => {
    expect(() =>
      passTurn({
        auctionCall: createAuctionCall({
          currentTurnAuctionSessionTeamId: "missing-team"
        }),
        teams: [
          createTeam("team-1", 0, 20),
          createTeam("team-2", 1, 15)
        ],
        auctionSessionTeamId: "missing-team"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_NOT_FOUND"
      })
    );
  });

  it("throws the expected domain error type", () => {
    expect(() =>
      passTurn({
        auctionCall: createAuctionCall({
          status: "SUSPENDED"
        }),
        teams: [],
        auctionSessionTeamId: "team-2"
      })
    ).toThrow(PassTurnDomainError);
  });
});
