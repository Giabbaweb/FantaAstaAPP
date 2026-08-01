import { describe, expect, it } from "vitest";

import {
  UndoPassDomainError,
  undoPass
} from "./undo-pass.js";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

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
    currentTurnAuctionSessionTeamId: "team-3",
    provisionalWinnerAuctionSessionTeamId: null,
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    ...overrides
  };
}

function createTeams(): AuctionCallTeam[] {
  return [
    {
      auctionCallId: "call-1",
      auctionSessionTeamId: "team-1",
      turnOrder: 0,
      status: "ACTIVE",
      maximumBid: 20,
      exclusionReason: null
    },
    {
      auctionCallId: "call-1",
      auctionSessionTeamId: "team-2",
      turnOrder: 1,
      status: "PASSED",
      maximumBid: 15,
      exclusionReason: null
    },
    {
      auctionCallId: "call-1",
      auctionSessionTeamId: "team-3",
      turnOrder: 2,
      status: "ACTIVE",
      maximumBid: 18,
      exclusionReason: null
    }
  ];
}

describe("undoPass", () => {
  it("restores a passed team during an open call", () => {
    const result = undoPass({
      auctionCall: createAuctionCall(),
      teams: createTeams(),
      auctionSessionTeamId: "team-2"
    });

    expect(result.auctionCall.status).toBe("OPEN");
    expect(
      result.auctionCall
        .currentTurnAuctionSessionTeamId
    ).toBe("team-2");

    expect(result.teams[1]).toEqual(
      expect.objectContaining({
        status: "ACTIVE",
        exclusionReason: null
      })
    );
  });

  it("reopens a provisional award", () => {
    const result = undoPass({
      auctionCall: createAuctionCall({
        status: "PROVISIONAL_AWARD",
        currentTurnAuctionSessionTeamId: null,
        provisionalWinnerAuctionSessionTeamId:
          "team-1"
      }),
      teams: createTeams(),
      auctionSessionTeamId: "team-2"
    });

    expect(result.auctionCall.status).toBe("OPEN");
    expect(
      result.auctionCall
        .currentTurnAuctionSessionTeamId
    ).toBe("team-2");
    expect(
      result.auctionCall
        .provisionalWinnerAuctionSessionTeamId
    ).toBeNull();
  });

  it("does not mutate the original auction call", () => {
    const auctionCall = createAuctionCall();

    undoPass({
      auctionCall,
      teams: createTeams(),
      auctionSessionTeamId: "team-2"
    });

    expect(
      auctionCall.currentTurnAuctionSessionTeamId
    ).toBe("team-3");
  });

  it("does not mutate the original teams", () => {
    const teams = createTeams();

    undoPass({
      auctionCall: createAuctionCall(),
      teams,
      auctionSessionTeamId: "team-2"
    });

    expect(teams[1]?.status).toBe("PASSED");
  });

  it("rejects a draft call", () => {
    expect(() =>
      undoPass({
        auctionCall: createAuctionCall({
          status: "DRAFT"
        }),
        teams: createTeams(),
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "AUCTION_CALL_NOT_REOPENABLE"
      })
    );
  });

  it("rejects a confirmed call", () => {
    expect(() =>
      undoPass({
        auctionCall: createAuctionCall({
          status: "CONFIRMED"
        }),
        teams: createTeams(),
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "AUCTION_CALL_NOT_REOPENABLE"
      })
    );
  });

  it("rejects a call without current bid", () => {
    expect(() =>
      undoPass({
        auctionCall: createAuctionCall({
          currentBid: null
        }),
        teams: createTeams(),
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "CURRENT_BID_NOT_SET"
      })
    );
  });

  it("rejects an unknown team", () => {
    expect(() =>
      undoPass({
        auctionCall: createAuctionCall(),
        teams: createTeams(),
        auctionSessionTeamId: "team-99"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_NOT_FOUND"
      })
    );
  });

  it("rejects an active team", () => {
    expect(() =>
      undoPass({
        auctionCall: createAuctionCall(),
        teams: createTeams(),
        auctionSessionTeamId: "team-3"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_NOT_PASSED"
      })
    );
  });

  it("rejects an excluded team", () => {
    const teams = createTeams();

    teams[1] = {
      ...teams[1]!,
      status: "EXCLUDED",
      exclusionReason: "MAXIMUM_BID_TOO_LOW"
    };

    expect(() =>
      undoPass({
        auctionCall: createAuctionCall(),
        teams,
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_NOT_PASSED"
      })
    );
  });

  it("rejects a team whose maximum bid equals the current bid", () => {
    const teams = createTeams();

    teams[1] = {
      ...teams[1]!,
      maximumBid: 5
    };

    expect(() =>
      undoPass({
        auctionCall: createAuctionCall(),
        teams,
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_MAXIMUM_BID_TOO_LOW"
      })
    );
  });

  it("rejects a team whose maximum bid is below the current bid", () => {
    const teams = createTeams();

    teams[1] = {
      ...teams[1]!,
      maximumBid: 4
    };

    expect(() =>
      undoPass({
        auctionCall: createAuctionCall(),
        teams,
        auctionSessionTeamId: "team-2"
      })
    ).toThrowError(
      expect.objectContaining({
        code: "TEAM_MAXIMUM_BID_TOO_LOW"
      })
    );
  });

  it("throws the expected domain error type", () => {
    expect(() =>
      undoPass({
        auctionCall: createAuctionCall({
          status: "CONFIRMED"
        }),
        teams: createTeams(),
        auctionSessionTeamId: "team-2"
      })
    ).toThrow(UndoPassDomainError);
  });
});
