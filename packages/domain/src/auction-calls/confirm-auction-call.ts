import {
  transitionAuctionCallStatus
} from "./auction-call.js";

import type { AuctionCall } from "./auction-call.js";

export type ConfirmAuctionCallInput = {
  auctionCall: AuctionCall;
};

export type ConfirmAuctionCallResult = {
  auctionCall: AuctionCall;
};

export type ConfirmAuctionCallDomainErrorCode =
  | "AUCTION_CALL_NOT_PROVISIONALLY_AWARDED"
  | "CURRENT_BID_NOT_SET"
  | "CURRENT_LEADER_NOT_SET"
  | "PROVISIONAL_WINNER_NOT_SET"
  | "PROVISIONAL_WINNER_MISMATCH";

export class ConfirmAuctionCallDomainError extends Error {
  readonly code: ConfirmAuctionCallDomainErrorCode;

  constructor(
    code: ConfirmAuctionCallDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "ConfirmAuctionCallDomainError";
    this.code = code;
  }
}

export function confirmAuctionCall(
  input: ConfirmAuctionCallInput
): ConfirmAuctionCallResult {
  const { auctionCall } = input;

  if (auctionCall.status !== "PROVISIONAL_AWARD") {
    throw new ConfirmAuctionCallDomainError(
      "AUCTION_CALL_NOT_PROVISIONALLY_AWARDED",
      "Only a provisionally awarded auction call can be confirmed"
    );
  }

  if (auctionCall.currentBid === null) {
    throw new ConfirmAuctionCallDomainError(
      "CURRENT_BID_NOT_SET",
      "Provisionally awarded auction call must have a current bid"
    );
  }

  if (
    auctionCall.currentLeaderAuctionSessionTeamId ===
    null
  ) {
    throw new ConfirmAuctionCallDomainError(
      "CURRENT_LEADER_NOT_SET",
      "Provisionally awarded auction call must have a current leader"
    );
  }

  if (
    auctionCall.provisionalWinnerAuctionSessionTeamId ===
    null
  ) {
    throw new ConfirmAuctionCallDomainError(
      "PROVISIONAL_WINNER_NOT_SET",
      "Provisionally awarded auction call must have a provisional winner"
    );
  }

  if (
    auctionCall.provisionalWinnerAuctionSessionTeamId !==
    auctionCall.currentLeaderAuctionSessionTeamId
  ) {
    throw new ConfirmAuctionCallDomainError(
      "PROVISIONAL_WINNER_MISMATCH",
      "Provisional winner must match the current leader"
    );
  }

  return {
    auctionCall: {
      ...auctionCall,
      status: transitionAuctionCallStatus(
        auctionCall.status,
        "confirm"
      ),
      currentTurnAuctionSessionTeamId: null
    }
  };
}
