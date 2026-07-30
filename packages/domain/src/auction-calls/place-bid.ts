import {
  transitionAuctionCallStatus
} from "./auction-call.js";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

export type PlaceBidInput = {
  auctionCall: AuctionCall;
  teams: readonly AuctionCallTeam[];
  auctionSessionTeamId: string;
  bid: number;
};

export type PlaceBidResult = {
  auctionCall: AuctionCall;
  teams: AuctionCallTeam[];
};

export type PlaceBidDomainErrorCode =
  | "AUCTION_CALL_NOT_OPEN"
  | "CURRENT_BID_NOT_SET"
  | "CURRENT_TURN_NOT_SET"
  | "TEAM_NOT_FOUND"
  | "TEAM_NOT_ACTIVE"
  | "NOT_TEAM_TURN"
  | "INVALID_BID"
  | "BID_NOT_HIGHER"
  | "BID_EXCEEDS_MAXIMUM";

export class PlaceBidDomainError extends Error {
  readonly code: PlaceBidDomainErrorCode;

  constructor(
    code: PlaceBidDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "PlaceBidDomainError";
    this.code = code;
  }
}

export function placeBid(
  input: PlaceBidInput
): PlaceBidResult {
  const {
    auctionCall,
    teams,
    auctionSessionTeamId,
    bid
  } = input;

  if (auctionCall.status !== "OPEN") {
    throw new PlaceBidDomainError(
      "AUCTION_CALL_NOT_OPEN",
      "Bids can be placed only on an open auction call"
    );
  }

  if (auctionCall.currentBid === null) {
    throw new PlaceBidDomainError(
      "CURRENT_BID_NOT_SET",
      "Open auction call must have a current bid"
    );
  }

  if (
    auctionCall.currentTurnAuctionSessionTeamId ===
    null
  ) {
    throw new PlaceBidDomainError(
      "CURRENT_TURN_NOT_SET",
      "Open auction call must have a current turn team"
    );
  }

  if (!Number.isInteger(bid) || bid < 1) {
    throw new PlaceBidDomainError(
      "INVALID_BID",
      "Bid must be an integer greater than or equal to 1"
    );
  }

  if (bid <= auctionCall.currentBid) {
    throw new PlaceBidDomainError(
      "BID_NOT_HIGHER",
      "Bid must be greater than the current bid"
    );
  }

  const bidderIndex = teams.findIndex(
    (team) =>
      team.auctionSessionTeamId ===
      auctionSessionTeamId
  );

  if (bidderIndex === -1) {
    throw new PlaceBidDomainError(
      "TEAM_NOT_FOUND",
      "Auction session team must belong to the auction call"
    );
  }

  const bidder = teams[bidderIndex];

  if (bidder === undefined) {
    throw new PlaceBidDomainError(
      "TEAM_NOT_FOUND",
      "Auction session team must belong to the auction call"
    );
  }

  if (
    auctionCall.currentTurnAuctionSessionTeamId !==
    auctionSessionTeamId
  ) {
    throw new PlaceBidDomainError(
      "NOT_TEAM_TURN",
      "Only the current turn team can place a bid"
    );
  }

  if (bidder.status !== "ACTIVE") {
    throw new PlaceBidDomainError(
      "TEAM_NOT_ACTIVE",
      "Only an active team can place a bid"
    );
  }

  if (bid > bidder.maximumBid) {
    throw new PlaceBidDomainError(
      "BID_EXCEEDS_MAXIMUM",
      "Bid cannot exceed the team maximum sustainable bid"
    );
  }

  const updatedTeams = teams.map((team) => {
    if (
      team.auctionSessionTeamId ===
      auctionSessionTeamId
    ) {
      return team;
    }

    if (
      team.status === "ACTIVE" &&
      team.maximumBid <= bid
    ) {
      return {
        ...team,
        status: "EXCLUDED" as const,
        exclusionReason: "MAXIMUM_BID_TOO_LOW" as const
      };
    }

    return team;
  });

  const nextTurnTeam = findNextActiveTeam(
    updatedTeams,
    bidderIndex,
    auctionSessionTeamId
  );

  if (nextTurnTeam === null) {
    return {
      auctionCall: {
        ...auctionCall,
        status: transitionAuctionCallStatus(
          auctionCall.status,
          "provisionalAward"
        ),
        currentBid: bid,
        currentLeaderAuctionSessionTeamId:
          auctionSessionTeamId,
        currentTurnAuctionSessionTeamId: null,
        provisionalWinnerAuctionSessionTeamId:
          auctionSessionTeamId
      },
      teams: updatedTeams
    };
  }

  return {
    auctionCall: {
      ...auctionCall,
      currentBid: bid,
      currentLeaderAuctionSessionTeamId:
        auctionSessionTeamId,
      currentTurnAuctionSessionTeamId:
        nextTurnTeam.auctionSessionTeamId,
      provisionalWinnerAuctionSessionTeamId: null
    },
    teams: updatedTeams
  };
}

function findNextActiveTeam(
  teams: readonly AuctionCallTeam[],
  bidderIndex: number,
  bidderAuctionSessionTeamId: string
): AuctionCallTeam | null {
  for (
    let offset = 1;
    offset < teams.length;
    offset += 1
  ) {
    const index =
      (bidderIndex + offset) % teams.length;

    const team = teams[index];

    if (
      team !== undefined &&
      team.status === "ACTIVE" &&
      team.auctionSessionTeamId !==
        bidderAuctionSessionTeamId
    ) {
      return team;
    }
  }

  return null;
}
