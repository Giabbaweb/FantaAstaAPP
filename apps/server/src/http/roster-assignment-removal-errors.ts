import {
  RosterAssignmentRemovalDomainError
} from "@fantaastaapp/domain";

import {
  AtomicRosterAssignmentRemovalCommandExecutorError
} from "../realtime/atomic-roster-assignment-removal-command.executor.js";
import {
  RosterAssignmentRemovalServiceError
} from "../services/roster-assignment-removal.service.js";

type RosterAssignmentRemovalErrorBody = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type RosterAssignmentRemovalErrorMapping = {
  statusCode: 404 | 409 | 500;
  body: RosterAssignmentRemovalErrorBody;
};

function createMapping(
  statusCode:
    RosterAssignmentRemovalErrorMapping["statusCode"],
  error: {
    code: string;
    message: string;
  }
): RosterAssignmentRemovalErrorMapping {
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

export function mapRosterAssignmentRemovalError(
  error: unknown
): RosterAssignmentRemovalErrorMapping | null {
  if (
    error instanceof
      AtomicRosterAssignmentRemovalCommandExecutorError
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
      RosterAssignmentRemovalServiceError
  ) {
    switch (error.code) {
      case "AUCTION_SESSION_NOT_FOUND":
      case "ROSTER_ENTRY_NOT_FOUND":
      case "TEAM_NOT_FOUND":
      case "PLAYER_NOT_FOUND":
        return createMapping(404, error);

      case "TEAM_SESSION_MISMATCH":
      case "PLAYER_SESSION_MISMATCH":
        return createMapping(409, error);

      case "TEAM_UPDATE_FAILED":
      case "ROSTER_ENTRY_DELETE_FAILED":
      case "PLAYER_UPDATE_FAILED":
        return createMapping(500, error);

      default:
        return null;
    }
  }

  if (
    error instanceof
      RosterAssignmentRemovalDomainError
  ) {
    switch (error.code) {
      case "ROSTER_ASSIGNMENT_REMOVAL_NOT_ALLOWED_IN_SESSION_STATUS":
        return createMapping(409, error);

      default:
        return null;
    }
  }

  return null;
}
