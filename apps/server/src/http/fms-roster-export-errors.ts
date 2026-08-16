import {
  FmsRevoRosterProjectionError
} from "../export/fms-revo-roster.projection.js";
import {
  FmsRevoRosterValidationError
} from "../export/fms-revo-roster.validator.js";
import {
  FmsRosterExportServiceError
} from "../services/fms-roster-export.service.js";

export type FmsRosterExportErrorResponse = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type FmsRosterExportErrorMapping = {
  statusCode: 404 | 409;
  body: FmsRosterExportErrorResponse;
};

export function mapFmsRosterExportError(
  error: unknown
): FmsRosterExportErrorMapping | null {
  if (
    error instanceof
    FmsRosterExportServiceError
  ) {
    const statusCode =
      error.code ===
        "AUCTION_SESSION_TEAM_NOT_FOUND" ||
      error.code ===
        "AUCTION_SESSION_NOT_FOUND"
        ? 404
        : 409;

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

  if (
    error instanceof
    FmsRevoRosterProjectionError
  ) {
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
  }

  if (
    error instanceof
    FmsRevoRosterValidationError
  ) {
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
  }

  return null;
}
