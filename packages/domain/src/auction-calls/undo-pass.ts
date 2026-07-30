import {
  transitionAuctionCallStatus
} from "./auction-call.js";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

export type UndoPassInput = {
  auctionCall: AuctionCall;
  teams: readonly AuctionCallTeam[];
  auctionSessionTeamId: string;
};

export type UndoPassResult = {
  auctionCall: AuctionCall;
  teams: AuctionCallTeam[];
};

export type UndoPassDomainErrorCode =
  | "AUCTION_CALL_NOT_REOPENABLE"
  | "CURRENT_BID_NOT_SET"
  | "TEAM_NOT_FOUND"
  | "TEAM_NOT_PASSED"
  | "TEAM_MAXIMUM_BID_TOO_LOW";

export class UndoPassDomainError extends Error {
  readonly code: UndoPassDomainErrorCode;

  constructor(
    code: UndoPassDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "UndoPassDomainError";
    this.code = code;
  }
}

export function undoPass(
  input: UndoPassInput
): UndoPassResult {
  const {
    auctionCall,
    teams,
    auctionSessionTeamId
  } = input;

  if (
    auctionCall.status !== "OPEN" &&
    auctionCall.status !== "PROVISIONAL_AWARD"
  ) {
    throw new UndoPassDomainError(
      "AUCTION_CALL_NOT_REOPENABLE",
      "Pass can be undone only on an open or provisionally awarded auction call"
    );
  }

  if (auctionCall.currentBid === null) {
    throw new UndoPassDomainError(
      "CURRENT_BID_NOT_SET",
      "Auction call must have a current bid"
    );
  }

  const teamIndex = teams.findIndex(
    (team) =>
      team.auctionSessionTeamId ===
      auctionSessionTeamId
  );

  if (teamIndex === -1) {
    throw new UndoPassDomainError(
      "TEAM_NOT_FOUND",
      "Auction session team must belong to the auction call"
    );
  }

  const team = teams[teamIndex];

  if (team === undefined) {
    throw new UndoPassDomainError(
      "TEAM_NOT_FOUND",
      "Auction session team must belong to the auction call"
    );
  }

  if (team.status !== "PASSED") {
    throw new UndoPassDomainError(
      "TEAM_NOT_PASSED",
      "Only a passed team can be restored"
    );
  }

  if (team.maximumBid <= auctionCall.currentBid) {
    throw new UndoPassDomainError(
      "TEAM_MAXIMUM_BID_TOO_LOW",
      "Team maximum bid must be greater than the current bid"
    );
  }

  const updatedTeams = teams.map((currentTeam) => {
    if (
      currentTeam.auctionSessionTeamId ===
      auctionSessionTeamId
    ) {
      return {
        ...currentTeam,
        status: "ACTIVE" as const,
        exclusionReason: null
      };
    }

    return currentTeam;
  });

  if (auctionCall.status === "PROVISIONAL_AWARD") {
    return {
      auctionCall: {
        ...auctionCall,
        status: transitionAuctionCallStatus(
          auctionCall.status,
          "reopen"
        ),
        currentTurnAuctionSessionTeamId:
          auctionSessionTeamId,
        provisionalWinnerAuctionSessionTeamId: null
      },
      teams: updatedTeams
    };
  }

  return {
    auctionCall: {
      ...auctionCall,
      currentTurnAuctionSessionTeamId:
        auctionSessionTeamId
    },
    teams: updatedTeams
  };
}
