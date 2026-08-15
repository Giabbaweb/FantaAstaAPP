import {
  ManualRosterAssignmentDomainError,
  RosterEntryDomainError
} from "@fantaastaapp/domain";

import {
  AtomicManualRosterAssignmentCommandExecutorError
} from "../realtime/atomic-manual-roster-assignment-command.executor.js";
import {
  ManualRosterAssignmentServiceError
} from "../services/manual-roster-assignment.service.js";

type ManualRosterAssignmentErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type ManualRosterAssignmentErrorMapping = {
  statusCode: 400 | 404 | 409 | 500;
  body: ManualRosterAssignmentErrorBody;
};

function createMapping(
  statusCode:
    ManualRosterAssignmentErrorMapping["statusCode"],
  error: {
    code: string;
    message: string;
  }
): ManualRosterAssignmentErrorMapping {
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

export function mapManualRosterAssignmentError(
  error: unknown
): ManualRosterAssignmentErrorMapping | null {
  if (
    error instanceof
      AtomicManualRosterAssignmentCommandExecutorError
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
      ManualRosterAssignmentServiceError
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
      ManualRosterAssignmentDomainError
  ) {
    switch (error.code) {
      case "MANUAL_ASSIGNMENT_NOT_ALLOWED_IN_SESSION_STATUS":
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
