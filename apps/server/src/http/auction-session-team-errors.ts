import {
  AuctionSessionTeamServiceError
} from "../services/auction-session-team.service.js";

export type AuctionSessionTeamNotFoundResponse = {
  data: null;
  error: {
    code: "AUCTION_SESSION_TEAM_NOT_FOUND";
    message: string;
  };
};

export type AuctionSessionTeamErrorMapping = {
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
