import {
  PlayerServiceError
} from "../services/player.service.js";

type PlayerErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type PlayerNotFoundResponse = PlayerErrorBody;

export type PlayerConflictResponse = PlayerErrorBody;

export function mapPlayerError(
  error: unknown
):
  | {
      statusCode: 404 | 409 | 500;
      body: PlayerErrorBody;
    }
  | undefined {
  if (!(error instanceof PlayerServiceError)) {
    return undefined;
  }

  switch (error.code) {
    case "PLAYER_NOT_FOUND":
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

    case "PLAYER_FMS_CODE_ALREADY_EXISTS":
    case "PLAYER_NAME_ALREADY_EXISTS":
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

    case "PLAYER_UPDATE_FAILED":
    case "PLAYER_DELETE_FAILED":
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
  }
}
