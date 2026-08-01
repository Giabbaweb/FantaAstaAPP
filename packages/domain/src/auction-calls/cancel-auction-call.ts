import {
  AuctionCallDomainError,
  transitionAuctionCallStatus
} from "./auction-call.js";

import type { AuctionCall } from "./auction-call.js";

export type CancelAuctionCallInput = {
  auctionCall: AuctionCall;
};

export type CancelAuctionCallResult = {
  auctionCall: AuctionCall;
};

export type CancelAuctionCallDomainErrorCode =
  "AUCTION_CALL_NOT_CANCELLABLE";

export class CancelAuctionCallDomainError extends Error {
  readonly code: CancelAuctionCallDomainErrorCode;

  constructor(
    code: CancelAuctionCallDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "CancelAuctionCallDomainError";
    this.code = code;
  }
}

export function cancelAuctionCall(
  input: CancelAuctionCallInput
): CancelAuctionCallResult {
  const { auctionCall } = input;

  let cancelledStatus: AuctionCall["status"];

  try {
    cancelledStatus = transitionAuctionCallStatus(
      auctionCall.status,
      "cancel"
    );
  } catch (error) {
    if (error instanceof AuctionCallDomainError) {
      throw new CancelAuctionCallDomainError(
        "AUCTION_CALL_NOT_CANCELLABLE",
        `Auction call cannot be cancelled from status "${auctionCall.status}"`
      );
    }

    throw error;
  }

  return {
    auctionCall: {
      ...auctionCall,
      status: cancelledStatus,
      currentTurnAuctionSessionTeamId: null,
      provisionalWinnerAuctionSessionTeamId: null
    }
  };
}
