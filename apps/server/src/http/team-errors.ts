import {
  TeamServiceError
} from "../services/team.service.js";

export type TeamNotFoundResponse = {
  data: null;
  error: {
    code: "TEAM_NOT_FOUND";
    message: string;
  };
};

export type TeamErrorMapping = {
  statusCode: 404;
  body: TeamNotFoundResponse;
};

export function mapTeamError(
  error: unknown
): TeamErrorMapping | null {
  if (!(error instanceof TeamServiceError)) {
    return null;
  }

  switch (error.code) {
    case "TEAM_NOT_FOUND":
      return {
        statusCode: 404,
        body: {
          data: null,
          error: {
            code: "TEAM_NOT_FOUND",
            message: error.message
          }
        }
      };

    default:
      return null;
  }
}
