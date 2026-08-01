import { describe, expect, it } from "vitest";

import type {
  AuctionCall,
  AuctionCallTeam
} from "./index.js";

import {
  openAuctionCall,
  passTurn,
  placeBid,
  undoPass
} from "./index.js";

function createCall(): AuctionCall {
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
    createdAt: "2026-07-30T00:00:00Z",
    updatedAt: "2026-07-30T00:00:00Z"
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
      status: "ACTIVE",
      maximumBid: 15,
      exclusionReason: null
    },
    {
      auctionCallId: "call-1",
      auctionSessionTeamId: "team-3",
      turnOrder: 2,
      status: "ACTIVE",
      maximumBid: 12,
      exclusionReason: null
    }
  ];
}

describe("auction flow", () => {
  it("completes an auction through bids and passes", () => {
    const opened = openAuctionCall({
      auctionCall: createCall(),
      teams: createTeams(),
      openingBid: 1
    });

    const bid = placeBid({
      auctionCall: opened.auctionCall,
      teams: opened.teams,
      auctionSessionTeamId: "team-2",
      bid: 2
    });

    const pass = passTurn({
      auctionCall: bid.auctionCall,
      teams: bid.teams,
      auctionSessionTeamId: "team-3"
    });

    const bid2 = placeBid({
      auctionCall: pass.auctionCall,
      teams: pass.teams,
      auctionSessionTeamId: "team-1",
      bid: 3
    });

    const provisional = passTurn({
      auctionCall: bid2.auctionCall,
      teams: bid2.teams,
      auctionSessionTeamId: "team-2"
    });

    expect(provisional.auctionCall.status).toBe(
      "PROVISIONAL_AWARD"
    );

    expect(
      provisional.auctionCall
        .provisionalWinnerAuctionSessionTeamId
    ).toBe("team-1");
  });

  it("reopens a provisional award after undo pass", () => {
    const opened = openAuctionCall({
      auctionCall: createCall(),
      teams: createTeams(),
      openingBid: 1
    });

    const bid = placeBid({
      auctionCall: opened.auctionCall,
      teams: opened.teams,
      auctionSessionTeamId: "team-2",
      bid: 2
    });

    const pass = passTurn({
      auctionCall: bid.auctionCall,
      teams: bid.teams,
      auctionSessionTeamId: "team-3"
    });

    const bid2 = placeBid({
      auctionCall: pass.auctionCall,
      teams: pass.teams,
      auctionSessionTeamId: "team-1",
      bid: 3
    });

    const provisional = passTurn({
      auctionCall: bid2.auctionCall,
      teams: bid2.teams,
      auctionSessionTeamId: "team-2"
    });

    const reopened = undoPass({
      auctionCall: provisional.auctionCall,
      teams: provisional.teams,
      auctionSessionTeamId: "team-2"
    });

    expect(reopened.auctionCall.status).toBe("OPEN");

    expect(
      reopened.auctionCall
        .currentTurnAuctionSessionTeamId
    ).toBe("team-2");

    expect(
      reopened.auctionCall
        .provisionalWinnerAuctionSessionTeamId
    ).toBeNull();

    const finalBid = placeBid({
      auctionCall: reopened.auctionCall,
      teams: reopened.teams,
      auctionSessionTeamId: "team-2",
      bid: 4
    });

    expect(finalBid.auctionCall.currentBid).toBe(4);
    expect(
      finalBid.auctionCall
        .currentLeaderAuctionSessionTeamId
    ).toBe("team-2");
  });
});
