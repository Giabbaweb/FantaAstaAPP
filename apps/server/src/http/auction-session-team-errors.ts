import {
  AuctionSessionTeamServiceError
} from "../services/auction-session-team.service.js";

export type AuctionSessionTeamInvalidReorderResponse = {
  data: null;
  error: {
    code: "AUCTION_SESSION_TEAM_REORDER_INVALID";
    message: string;
  };
};

export type AuctionSessionTeamReorderNotAllowedResponse = {
  data: null;
  error: {
    code: "AUCTION_SESSION_TEAM_REORDER_NOT_ALLOWED";
    message: string;
  };
};

export type AuctionSessionTeamNotFoundResponse = {
  data: null;
  error: {
    code: "AUCTION_SESSION_TEAM_NOT_FOUND";
    message: string;
  };
};

export type AuctionSessionTeamErrorMapping =
  | {
      statusCode: 400;
      body: AuctionSessionTeamInvalidReorderResponse;
    }
  | {
      statusCode: 409;
      body: AuctionSessionTeamReorderNotAllowedResponse;
    }
  | {
      statusCode: 404;
      body: AuctionSessionTeamNotFoundResponse;
    };

export function mapAuctionSessionTeamError(
  error: unknown
): AuctionSessionTeamErrorMapping | null {
  if (
    !(
      error instanceof
      AuctionSessionTeamServiceError
    )
  ) {
    return null;
  }

  switch (error.code) {
    case "AUCTION_SESSION_TEAM_REORDER_INVALID":
      return {
        statusCode: 400,
        body: {
          data: null,
          error: {
            code:
              "AUCTION_SESSION_TEAM_REORDER_INVALID",
            message: error.message
          }
        }
      };

    case "AUCTION_SESSION_TEAM_REORDER_NOT_ALLOWED":
      return {
        statusCode: 409,
        body: {
          data: null,
          error: {
            code:
              "AUCTION_SESSION_TEAM_REORDER_NOT_ALLOWED",
            message: error.message
          }
        }
      };

    case "AUCTION_SESSION_TEAM_NOT_FOUND":
      return {
        statusCode: 404,
        body: {
          data: null,
          error: {
            code:
              "AUCTION_SESSION_TEAM_NOT_FOUND",
            message: error.message
          }
        }
      };

    default:
      return null;
  }
}
