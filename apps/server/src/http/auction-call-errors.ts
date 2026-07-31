import {
  AuctionCallServiceError
} from "../services/auction-call.service.js";

export type AuctionCallNotFoundResponse = {
  data: null;
  error: {
    code: "AUCTION_CALL_NOT_FOUND";
    message: string;
  };
};

export type AuctionCallErrorMapping = {
  statusCode: 404;
  body: AuctionCallNotFoundResponse;
};

export function mapAuctionCallError(
  error: unknown
): AuctionCallErrorMapping | null {
  if (!(error instanceof AuctionCallServiceError)) {
    return null;
  }

  switch (error.code) {
    case "AUCTION_CALL_NOT_FOUND":
      return {
        statusCode: 404,
        body: {
          data: null,
          error: {
            code: "AUCTION_CALL_NOT_FOUND",
            message: error.message
          }
        }
      };

    default:
      return null;
  }
}
