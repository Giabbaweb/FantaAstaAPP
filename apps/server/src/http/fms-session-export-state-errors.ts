import {
  FmsSessionExportStateServiceError
} from "../services/fms-session-export-state.service.js";

type FmsSessionExportStateErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type FmsSessionExportStateErrorMapping = {
  statusCode: 404 | 409;
  body: FmsSessionExportStateErrorBody;
};

function createMapping(
  statusCode:
    FmsSessionExportStateErrorMapping["statusCode"],
  error: {
    code: string;
    message: string;
  }
): FmsSessionExportStateErrorMapping {
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

export function mapFmsSessionExportStateError(
  error: unknown
): FmsSessionExportStateErrorMapping | null {
  if (
    error instanceof
      FmsSessionExportStateServiceError
  ) {
    switch (error.code) {
      case "AUCTION_SESSION_NOT_FOUND":
        return createMapping(404, error);

      case "AUCTION_SESSION_NOT_COMPLETED":
        return createMapping(409, error);

      default:
        return null;
    }
  }

  return null;
}
