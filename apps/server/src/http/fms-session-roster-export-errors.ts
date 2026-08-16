import {
  mapFmsRosterExportError
} from "./fms-roster-export-errors.js";
import type {
  FmsRosterExportErrorMapping
} from "./fms-roster-export-errors.js";
import {
  FmsSessionRosterExportServiceError
} from "../services/fms-session-roster-export.service.js";

export function mapFmsSessionRosterExportError(
  error: unknown
): FmsRosterExportErrorMapping | null {
  if (
    error instanceof
    FmsSessionRosterExportServiceError
  ) {
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
  }

  return mapFmsRosterExportError(error);
}
