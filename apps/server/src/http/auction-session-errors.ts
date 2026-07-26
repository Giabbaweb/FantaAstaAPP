import {
  AuctionSessionDomainError
} from "@fantaastaapp/domain";

import {
  AuctionSessionServiceError
} from "../services/auction-session.service.js";

export type AuctionSessionNotFoundResponse = {
  data: null;
  error: {
    code: "AUCTION_SESSION_NOT_FOUND";
    message: string;
  };
};

export type AuctionSessionConflictResponse = {
  data: null;
  error: {
    code:
      | "SESSION_READ_ONLY"
      | "STRUCTURAL_FIELDS_LOCKED"
      | "INITIAL_CREDITS_LOCKED"
      | "SESSION_DELETE_NOT_ALLOWED";
    message: string;
  };
};

export type AuctionSessionErrorMapping =
  | {
      statusCode: 404;
      body: AuctionSessionNotFoundResponse;
    }
  | {
      statusCode: 409;
      body: AuctionSessionConflictResponse;
    };

export function mapAuctionSessionError(
  error: unknown
): AuctionSessionErrorMapping | null {
  if (error instanceof AuctionSessionServiceError) {
    switch (error.code) {
      case "SESSION_NOT_FOUND":
        return {
          statusCode: 404,
          body: {
            data: null,
            error: {
              code: "AUCTION_SESSION_NOT_FOUND",
              message: error.message
            }
          }
        };

      default:
        return null;
    }
  }

  if (error instanceof AuctionSessionDomainError) {
    switch (error.code) {
      case "SESSION_READ_ONLY":
      case "STRUCTURAL_FIELDS_LOCKED":
      case "INITIAL_CREDITS_LOCKED":
      case "SESSION_DELETE_NOT_ALLOWED":
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

      default:
        return null;
    }
  }

  return null;
}
