import {
  TeamOwnerServiceError
} from "../services/team-owner.service.js";

export type TeamOwnerNotFoundResponse = {
  data: null;
  error: {
    code: "TEAM_OWNER_NOT_FOUND";
    message: string;
  };
};

export type TeamOwnerConflictResponse = {
  data: null;
  error: {
    code: "TEAM_OWNER_ALREADY_EXISTS";
    message: string;
  };
};

export type TeamOwnerErrorMapping =
  | {
      statusCode: 404;
      body: TeamOwnerNotFoundResponse;
    }
  | {
      statusCode: 409;
      body: TeamOwnerConflictResponse;
    };

export function mapTeamOwnerError(
  error: unknown
): TeamOwnerErrorMapping | null {
  if (
    !(error instanceof TeamOwnerServiceError)
  ) {
    return null;
  }

  switch (error.code) {
    case "TEAM_OWNER_NOT_FOUND":
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

    case "TEAM_OWNER_ALREADY_EXISTS":
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
