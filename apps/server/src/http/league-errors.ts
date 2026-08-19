import {
  LeagueServiceError
} from "../services/league.service.js";

export type LeagueNotFoundResponse = {
  data: null;
  error: {
    code: "LEAGUE_NOT_FOUND";
    message: string;
  };
};

export type LeagueNameConflictResponse = {
  data: null;
  error: {
    code: "LEAGUE_NAME_ALREADY_EXISTS";
    message: string;
  };
};

export type LeagueErrorMapping =
  | {
      statusCode: 404;
      body: LeagueNotFoundResponse;
    }
  | {
      statusCode: 409;
      body: LeagueNameConflictResponse;
    };

export function mapLeagueError(
  error: unknown
): LeagueErrorMapping | null {
  if (
    !(error instanceof LeagueServiceError)
  ) {
    return null;
  }

  switch (error.code) {
    case "LEAGUE_NOT_FOUND":
      return {
        statusCode: 404,
        body: {
          data: null,
          error: {
            code: "LEAGUE_NOT_FOUND",
            message: error.message
          }
        }
      };

    case "LEAGUE_NAME_ALREADY_EXISTS":
      return {
        statusCode: 409,
        body: {
          data: null,
          error: {
            code:
              "LEAGUE_NAME_ALREADY_EXISTS",
            message: error.message
          }
        }
      };

    default:
      return null;
  }
}
