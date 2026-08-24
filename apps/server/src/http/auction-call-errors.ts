import {
  AuctionCallDomainError,
  ConfirmAuctionCallDomainError,
  CreateAuctionCallDraftDomainError,
  MaximumBidDomainError,
  OpenAuctionCallDomainError,
  PassTurnDomainError,
  PlaceBidDomainError,
  RosterEntryDomainError,
  UndoPassDomainError
} from "@fantaastaapp/domain";

import {
  AtomicAuctionCommandExecutorError
} from "../realtime/atomic-auction-command.executor.js";
import {
  AtomicAuctionCallCreationError
} from "../realtime/atomic-auction-call-creation.executor.js";
import {
  AuctionCallCreationServiceError
} from "../services/auction-call-creation.service.js";
import {
  AuctionCallServiceError
} from "../services/auction-call.service.js";
import {
  ConfirmedAuctionAwardServiceError
} from "../services/confirmed-auction-award.service.js";

type AuctionCallErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type AuctionCallNotFoundResponse =
  AuctionCallErrorBody;

export type AuctionCallConflictResponse =
  AuctionCallErrorBody;

export type AuctionCallInternalErrorResponse =
  AuctionCallErrorBody;

export type AuctionCallErrorMapping = {
  statusCode: 400 | 404 | 409 | 500;
  body: AuctionCallErrorBody;
};

function createMapping(
  statusCode: AuctionCallErrorMapping["statusCode"],
  error: {
    code: string;
    message: string;
  }
): AuctionCallErrorMapping {
  return {
    statusCode,
    body: {
      data: null,
      error: {
        code: error.code,
        message: error.message
      }
    }
  };
}

export function mapAuctionCallError(
  error: unknown
): AuctionCallErrorMapping | null {
  if (
    error instanceof
      AtomicAuctionCallCreationError
  ) {
    switch (error.code) {
      case "AUCTION_SESSION_STATE_NOT_FOUND":
        return createMapping(404, error);

      case "AUCTION_SESSION_NOT_RUNNING":
      case "OPERATIONAL_AUCTION_CALL_ALREADY_EXISTS":
      case "STALE_STATE":
      case "COMMAND_ID_CONFLICT":
        return createMapping(409, error);

      case "AUCTION_CALL_SAVE_FAILED":
        return createMapping(500, error);

      default:
        return null;
    }
  }

  if (
    error instanceof
      AuctionCallCreationServiceError
  ) {
    switch (error.code) {
      case "PLAYER_NOT_FOUND":
        return createMapping(404, error);

      case "PLAYER_NOT_AVAILABLE":
      case "PLAYER_ALREADY_ROSTERED":
      case "NO_SESSION_TEAMS":
      case "CALLER_NOT_FOUND":
        return createMapping(409, error);

      default:
        return null;
    }
  }

  if (
    error instanceof
      CreateAuctionCallDraftDomainError
  ) {
    return createMapping(409, error);
  }

  if (
    error instanceof
      AtomicAuctionCommandExecutorError
  ) {
    switch (error.code) {
      case "AUCTION_CALL_NOT_FOUND":
      case "AUCTION_SESSION_STATE_NOT_FOUND":
        return createMapping(404, error);

      case "AUCTION_SESSION_SUSPENDED":
      case "STALE_STATE":
      case "COMMAND_ID_CONFLICT":
        return createMapping(409, error);

      case "AUCTION_CALL_SAVE_FAILED":
        return createMapping(500, error);

      default:
        return null;
    }
  }

  if (error instanceof AuctionCallServiceError) {
    switch (error.code) {
      case "AUCTION_CALL_NOT_FOUND":
        return createMapping(404, error);

      case "AUCTION_CALL_SAVE_FAILED":
        return createMapping(500, error);

      default:
        return null;
    }
  }

  if (error instanceof AuctionCallDomainError) {
    return createMapping(409, error);
  }

  if (error instanceof OpenAuctionCallDomainError) {
    return createMapping(
      error.code === "INVALID_OPENING_BID"
        ? 400
        : 409,
      error
    );
  }

  if (error instanceof PlaceBidDomainError) {
    return createMapping(
      error.code === "INVALID_BID"
        ? 400
        : 409,
      error
    );
  }

  if (
    error instanceof PassTurnDomainError ||
    error instanceof UndoPassDomainError ||
    error instanceof ConfirmAuctionCallDomainError
  ) {
    return createMapping(409, error);
  }

  if (error instanceof RosterEntryDomainError) {
    return createMapping(
      error.code === "INVALID_ACQUISITION_COST" ||
        error.code === "INVALID_CONTRACT_YEAR"
        ? 400
        : 409,
      error
    );
  }

  if (error instanceof MaximumBidDomainError) {
    return createMapping(
      error.code === "INVALID_REMAINING_CREDITS" ||
        error.code === "INVALID_REMAINING_ROSTER_SLOTS"
        ? 400
        : 409,
      error
    );
  }

  if (
    error instanceof
      ConfirmedAuctionAwardServiceError
  ) {
    switch (error.code) {
      case "WINNER_NOT_FOUND":
      case "PLAYER_NOT_FOUND":
      case "PLAYER_SESSION_MISMATCH":
        return createMapping(409, error);

      case "PLAYER_NOT_AVAILABLE":
      case "PLAYER_ALREADY_ROSTERED":
        return createMapping(409, error);

      case "ROSTER_PLAYER_NOT_FOUND":
        return createMapping(409, error);

      case "WINNER_UPDATE_FAILED":
      case "PLAYER_UPDATE_FAILED":
        return createMapping(500, error);

      default:
        return null;
    }
  }

  return null;
}
