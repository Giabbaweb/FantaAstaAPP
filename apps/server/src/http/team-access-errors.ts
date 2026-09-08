import {
  TeamAccessServiceError
} from "../realtime/team-access.service.js";

export type TeamAccessNotFoundResponse = {
  data: null;
  error: {
    code: "TEAM_ACCESS_NOT_FOUND";
    message: string;
  };
};

export type TeamAccessErrorMapping = {
  statusCode: 404;
  body: TeamAccessNotFoundResponse;
};

export function mapTeamAccessError(
  error: unknown
): TeamAccessErrorMapping | null {
  if (
    !(
      error instanceof
      TeamAccessServiceError
    )
  ) {
    return null;
  }

  switch (error.code) {
    case "TEAM_ACCESS_NOT_FOUND":
      return {
        statusCode: 404,
        body: {
          data: null,
          error: {
            code: "TEAM_ACCESS_NOT_FOUND",
            message: error.message
          }
        }
      };

    default:
      return null;
  }
}
