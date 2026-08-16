import {
  FmsExportGoalkeeperSelectionServiceError
} from "../services/fms-export-goalkeeper-selection.service.js";

type FmsExportGoalkeeperSelectionErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type FmsExportGoalkeeperSelectionErrorMapping = {
  statusCode: 404 | 409;
  body: FmsExportGoalkeeperSelectionErrorBody;
};

function createMapping(
  statusCode:
    FmsExportGoalkeeperSelectionErrorMapping["statusCode"],
  error: {
    code: string;
    message: string;
  }
): FmsExportGoalkeeperSelectionErrorMapping {
  return {
    statusCode,
    body: {
      data: null,
      error: {
        code: error.code,
        message: error.message
      }
    }
  };
}

export function mapFmsExportGoalkeeperSelectionError(
  error: unknown
): FmsExportGoalkeeperSelectionErrorMapping | null {
  if (
    error instanceof
      FmsExportGoalkeeperSelectionServiceError
  ) {
    switch (error.code) {
      case "AUCTION_SESSION_TEAM_NOT_FOUND":
      case "AUCTION_SESSION_NOT_FOUND":
      case "PLAYER_NOT_FOUND":
        return createMapping(404, error);

      case "AUCTION_SESSION_NOT_SELECTABLE":
      case "PLAYER_SESSION_MISMATCH":
      case "PLAYER_NOT_GOALKEEPER":
      case "PLAYER_ALREADY_ROSTERED":
      case "PLAYER_ALREADY_SELECTED":
      case "ROSTER_GOALKEEPERS_INVALID":
      case "INVALID_GOALKEEPER_REAL_TEAM":
        return createMapping(409, error);

      default:
        return null;
    }
  }

  return null;
}
