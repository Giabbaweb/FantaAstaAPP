import {
  ManualInitialRosterEntryDomainError,
  RosterEntryDomainError
} from "@fantaastaapp/domain";

import {
  AtomicManualInitialRosterCommandExecutorError
} from "../realtime/atomic-manual-initial-roster-command.executor.js";
import {
  ManualInitialRosterEntryServiceError
} from "../services/manual-initial-roster-entry.service.js";

type ManualInitialRosterErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type ManualInitialRosterErrorMapping = {
  statusCode: 400 | 404 | 409 | 500;
  body: ManualInitialRosterErrorBody;
};

function createMapping(
  statusCode:
    ManualInitialRosterErrorMapping["statusCode"],
  error: {
    code: string;
    message: string;
  }
): ManualInitialRosterErrorMapping {
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

export function mapManualInitialRosterError(
  error: unknown
): ManualInitialRosterErrorMapping | null {
  if (
    error instanceof
      AtomicManualInitialRosterCommandExecutorError
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
      ManualInitialRosterEntryServiceError
  ) {
    switch (error.code) {
      case "AUCTION_SESSION_NOT_FOUND":
      case "AUCTION_SESSION_TEAM_NOT_FOUND":
      case "PLAYER_NOT_FOUND":
        return createMapping(404, error);

      case "TEAM_SESSION_MISMATCH":
      case "PLAYER_SESSION_MISMATCH":
      case "PLAYER_NOT_AVAILABLE":
      case "PLAYER_ALREADY_ROSTERED":
      case "ROSTER_PLAYER_NOT_FOUND":
        return createMapping(409, error);

      case "TEAM_UPDATE_FAILED":
      case "PLAYER_UPDATE_FAILED":
        return createMapping(500, error);

      default:
        return null;
    }
  }

  if (
    error instanceof
      ManualInitialRosterEntryDomainError
  ) {
    switch (error.code) {
      case "INITIAL_ROSTER_LIMIT_EXCEEDED":
      case "MANUAL_INITIAL_ROSTER_NOT_ALLOWED_IN_STATUS":
        return createMapping(409, error);

      case "INVALID_INITIAL_ROSTER_LIMIT":
        return createMapping(500, error);

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
