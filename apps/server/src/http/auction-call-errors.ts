import {
  AuctionCallDomainError,
  OpenAuctionCallDomainError,
  PassTurnDomainError,
  PlaceBidDomainError,
  UndoPassDomainError
} from "@fantaastaapp/domain";

import {
  AtomicAuctionCommandExecutorError
} from "../realtime/atomic-auction-command.executor.js";
import {
  AuctionCallServiceError
} from "../services/auction-call.service.js";

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

export function mapAuctionCallError(
  error: unknown
): AuctionCallErrorMapping | null {
  if (
    error instanceof
      AtomicAuctionCommandExecutorError
  ) {
    switch (error.code) {
      case "AUCTION_CALL_NOT_FOUND":
      case "AUCTION_SESSION_STATE_NOT_FOUND":
        return {
          statusCode: 404,
          body: {
            data: null,
            error: {
              code: error.code,
              message: error.message
            }
          }
        };

      case "STALE_STATE":
      case "COMMAND_ID_CONFLICT":
        return {
          statusCode: 409,
          body: {
            data: null,
            error: {
              code: error.code,
              message: error.message
            }
          }
        };

      case "AUCTION_CALL_SAVE_FAILED":
        return {
          statusCode: 500,
          body: {
            data: null,
            error: {
              code: error.code,
              message: error.message
            }
          }
        };

      default:
        return null;
    }
  }

  if (error instanceof AuctionCallServiceError) {
    switch (error.code) {
      case "AUCTION_CALL_NOT_FOUND":
        return {
          statusCode: 404,
          body: {
            data: null,
            error: {
              code: error.code,
              message: error.message
            }
          }
        };

      case "AUCTION_CALL_SAVE_FAILED":
        return {
          statusCode: 500,
          body: {
            data: null,
            error: {
              code: error.code,
              message: error.message
            }
          }
        };

      default:
        return null;
    }
  }

  if (error instanceof AuctionCallDomainError) {
    return {
      statusCode: 409,
      body: {
        data: null,
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof OpenAuctionCallDomainError) {
    const statusCode =
      error.code === "INVALID_OPENING_BID"
        ? 400
        : 409;

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

  if (error instanceof PlaceBidDomainError) {
    const statusCode =
      error.code === "INVALID_BID"
        ? 400
        : 409;

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

  if (
    error instanceof PassTurnDomainError ||
    error instanceof UndoPassDomainError
  ) {
    return {
      statusCode: 409,
      body: {
        data: null,
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  return null;
}
