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

export function mapAuctionSessionServiceError(
  error: unknown
): {
  statusCode: 404;
  body: AuctionSessionNotFoundResponse;
} | null {
  if (!(error instanceof AuctionSessionServiceError)) {
    return null;
  }

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
