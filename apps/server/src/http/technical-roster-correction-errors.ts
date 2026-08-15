import {
  RosterEntryDomainError,
  TechnicalRosterCorrectionDomainError
} from "@fantaastaapp/domain";

import {
  AtomicTechnicalRosterCorrectionCommandExecutorError
} from "../realtime/atomic-technical-roster-correction-command.executor.js";
import {
  TechnicalRosterCorrectionServiceError
} from "../services/technical-roster-correction.service.js";

type TechnicalRosterCorrectionErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type TechnicalRosterCorrectionErrorMapping = {
  statusCode: 400 | 404 | 409 | 500;
  body: TechnicalRosterCorrectionErrorBody;
};

function createMapping(
  statusCode:
    TechnicalRosterCorrectionErrorMapping["statusCode"],
  error: {
    code: string;
    message: string;
  }
): TechnicalRosterCorrectionErrorMapping {
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

export function mapTechnicalRosterCorrectionError(
  error: unknown
): TechnicalRosterCorrectionErrorMapping | null {
  if (
    error instanceof
      AtomicTechnicalRosterCorrectionCommandExecutorError
  ) {
    switch (error.code) {
      case "AUCTION_SESSION_NOT_FOUND":
        return createMapping(404, error);

      case "STALE_STATE":
      case "COMMAND_ID_CONFLICT":
        return createMapping(409, error);

      default:
        return null;
    }
  }

  if (
    error instanceof
      TechnicalRosterCorrectionServiceError
  ) {
    switch (error.code) {
      case "AUCTION_SESSION_NOT_FOUND":
      case "ROSTER_ENTRY_NOT_FOUND":
      case "SOURCE_TEAM_NOT_FOUND":
      case "TARGET_TEAM_NOT_FOUND":
      case "SOURCE_PLAYER_NOT_FOUND":
      case "TARGET_PLAYER_NOT_FOUND":
        return createMapping(404, error);

      case "TEAM_SESSION_MISMATCH":
      case "PLAYER_SESSION_MISMATCH":
      case "TARGET_PLAYER_NOT_AVAILABLE":
      case "TARGET_PLAYER_ALREADY_ROSTERED":
      case "ROSTER_PLAYER_NOT_FOUND":
        return createMapping(409, error);

      case "ROSTER_ENTRY_UPDATE_FAILED":
      case "SOURCE_TEAM_UPDATE_FAILED":
      case "TARGET_TEAM_UPDATE_FAILED":
      case "SOURCE_PLAYER_UPDATE_FAILED":
      case "TARGET_PLAYER_UPDATE_FAILED":
        return createMapping(500, error);

      default:
        return null;
    }
  }

  if (
    error instanceof
      TechnicalRosterCorrectionDomainError
  ) {
    switch (error.code) {
      case "TECHNICAL_CORRECTION_NOT_ALLOWED_IN_SESSION_STATUS":
        return createMapping(409, error);

      default:
        return null;
    }
  }

  if (error instanceof RosterEntryDomainError) {
    return createMapping(
      error.code === "INVALID_ACQUISITION_COST" ||
        error.code === "INVALID_CONTRACT_YEAR"
        ? 400
        : 409,
      error
    );
  }

  return null;
}
