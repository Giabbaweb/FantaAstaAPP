import {
  AuctionSessionDomainError
} from "@fantaastaapp/domain";

import {
  AtomicAuctionSessionCommandExecutorError
} from "../realtime/atomic-auction-session-command.executor.js";
import {
  AuctionSessionCompletionError
} from "../services/auction-session-completion.service.js";
import {
  AuctionSessionServiceError
} from "../services/auction-session.service.js";

export type AuctionSessionNotFoundResponse = {
  data: null;
  error: {
    code: "AUCTION_SESSION_NOT_FOUND";
    message: string;
  };
};

export type AuctionSessionConflictResponse = {
  data: null;
  error: {
    code:
      | "SESSION_READ_ONLY"
      | "STRUCTURAL_FIELDS_LOCKED"
      | "INITIAL_CREDITS_LOCKED"
      | "SESSION_DELETE_NOT_ALLOWED"
      | "INVALID_STATUS_TRANSITION"
      | "ACTIVE_SESSION_ALREADY_EXISTS"
      | "OPERATIONAL_AUCTION_CALL_EXISTS"
      | "AUCTION_SESSION_ROSTERS_INCOMPLETE"
      | "FMS_EXPORT_REQUIRED";
    message: string;
  };
};

export type AuctionSessionCreationConflictResponse = {
  data: null;
  error: {
    code:
      | "AUCTION_SESSION_LEAGUE_NOT_FOUND"
      | "AUCTION_SESSION_SEASON_ALREADY_EXISTS"
      | "AUCTION_SESSION_EDITION_ALREADY_EXISTS";
    message: string;
  };
};

type SqliteConstraintError = Error & {
  code?: string;
};

function isSqliteConstraintError(
  error: unknown
): error is SqliteConstraintError {
  return error instanceof Error;
}

export type AuctionSessionErrorMapping =
  | {
      statusCode: 404;
      body: AuctionSessionNotFoundResponse;
    }
  | {
      statusCode: 409;
      body: AuctionSessionConflictResponse;
    };

export type AuctionSessionOperationalCommandErrorResponse = {
  data: null;
  error: {
    code:
      | "AUCTION_SESSION_NOT_FOUND"
      | "STALE_STATE"
      | "COMMAND_ID_CONFLICT"
      | "OPERATIONAL_AUCTION_SESSION_ALREADY_EXISTS"
      | "AUCTION_SESSION_SAVE_FAILED";
    message: string;
  };
};

export type AuctionSessionOperationalCommandErrorMapping = {
  statusCode: 404 | 409 | 500;
  body: AuctionSessionOperationalCommandErrorResponse;
};

export function mapAuctionSessionError(
  error: unknown
): AuctionSessionErrorMapping | null {
  if (
    error instanceof
    AuctionSessionCompletionError
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

  if (error instanceof AuctionSessionServiceError) {
    switch (error.code) {
      case "SESSION_NOT_FOUND":
        return {
          statusCode: 404,
          body: {
            data: null,
            error: {
              code: "AUCTION_SESSION_NOT_FOUND",
              message: error.message
            }
          }
        };

      case "ACTIVE_SESSION_ALREADY_EXISTS":
        return {
          statusCode: 409,
          body: {
            data: null,
            error: {
              code: "ACTIVE_SESSION_ALREADY_EXISTS",
              message: error.message
            }
          }
        };

      default:
        return null;
    }
  }

  if (error instanceof AuctionSessionDomainError) {
    switch (error.code) {
      case "SESSION_READ_ONLY":
      case "STRUCTURAL_FIELDS_LOCKED":
      case "INITIAL_CREDITS_LOCKED":
      case "SESSION_DELETE_NOT_ALLOWED":
      case "INVALID_STATUS_TRANSITION":
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

  return null;
}

export function mapAuctionSessionOperationalCommandError(
  error: unknown
): AuctionSessionOperationalCommandErrorMapping | null {
  if (
    !(
      error instanceof
      AtomicAuctionSessionCommandExecutorError
    )
  ) {
    return null;
  }

  switch (error.code) {
    case "AUCTION_SESSION_NOT_FOUND":
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

    case "STALE_STATE":
    case "COMMAND_ID_CONFLICT":
    case "OPERATIONAL_AUCTION_SESSION_ALREADY_EXISTS":
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

    case "AUCTION_SESSION_SAVE_FAILED":
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

    default:
      return null;
  }
}

export function mapAuctionSessionCreationError(
  error: unknown
):
  | {
      statusCode: 409;
      body: AuctionSessionCreationConflictResponse;
    }
  | null {
  if (!isSqliteConstraintError(error)) {
    return null;
  }

  if (
    error.code === "SQLITE_CONSTRAINT_FOREIGNKEY"
  ) {
    return {
      statusCode: 409,
      body: {
        data: null,
        error: {
          code: "AUCTION_SESSION_LEAGUE_NOT_FOUND",
          message:
            "The selected league does not exist"
        }
      }
    };
  }

  if (
    error.code === "SQLITE_CONSTRAINT_UNIQUE" &&
    error.message.includes(
      "auction_sessions.league_id, auction_sessions.season"
    )
  ) {
    return {
      statusCode: 409,
      body: {
        data: null,
        error: {
          code:
            "AUCTION_SESSION_SEASON_ALREADY_EXISTS",
          message:
            "An auction session already exists for this league and season"
        }
      }
    };
  }

  if (
    error.code === "SQLITE_CONSTRAINT_UNIQUE" &&
    error.message.includes(
      "auction_sessions.league_id, auction_sessions.edition_number"
    )
  ) {
    return {
      statusCode: 409,
      body: {
        data: null,
        error: {
          code:
            "AUCTION_SESSION_EDITION_ALREADY_EXISTS",
          message:
            "An auction session already exists for this league and edition number"
        }
      }
    };
  }

  return null;
}
