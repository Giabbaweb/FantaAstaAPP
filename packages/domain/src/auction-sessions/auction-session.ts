import type {
  AuctionSession,
  AuctionSessionStatus,
  UpdateAuctionSessionInput
} from "@fantaastaapp/contracts";

export const auctionSessionCommands = [
  "ready",
  "start",
  "suspend",
  "resume",
  "complete",
  "close",
  "reopen"
] as const;

export type AuctionSessionCommand =
  (typeof auctionSessionCommands)[number];

export type AuctionSessionDomainErrorCode =
  | "INVALID_STATUS_TRANSITION"
  | "SESSION_READ_ONLY"
  | "STRUCTURAL_FIELDS_LOCKED"
  | "INITIAL_CREDITS_LOCKED"
  | "SESSION_DELETE_NOT_ALLOWED";

export class AuctionSessionDomainError extends Error {
  readonly code: AuctionSessionDomainErrorCode;

  constructor(
    code: AuctionSessionDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "AuctionSessionDomainError";
    this.code = code;
  }
}

const statusTransitions: Record<
  AuctionSessionStatus,
  Partial<Record<AuctionSessionCommand, AuctionSessionStatus>>
> = {
  SETUP: {
    ready: "READY"
  },
  READY: {
    start: "RUNNING"
  },
  RUNNING: {
    suspend: "SUSPENDED",
    complete: "COMPLETED"
  },
  SUSPENDED: {
    resume: "RUNNING"
  },
  COMPLETED: {
    close: "CLOSED"
  },
  CLOSED: {
    reopen: "COMPLETED"
  }
};

const operationalStatuses: ReadonlySet<AuctionSessionStatus> =
  new Set([
    "READY",
    "RUNNING",
    "SUSPENDED"
  ]);

const initialCreditsEditableStatuses: ReadonlySet<AuctionSessionStatus> =
  new Set([
    "SETUP",
    "READY",
    "RUNNING",
    "SUSPENDED"
  ]);

export function transitionAuctionSessionStatus(
  currentStatus: AuctionSessionStatus,
  command: AuctionSessionCommand
): AuctionSessionStatus {
  const nextStatus = statusTransitions[currentStatus][command];

  if (!nextStatus) {
    throw new AuctionSessionDomainError(
      "INVALID_STATUS_TRANSITION",
      `Command "${command}" is not allowed from status "${currentStatus}"`
    );
  }

  return nextStatus;
}

export function isOperationalAuctionSessionStatus(
  status: AuctionSessionStatus
): boolean {
  return operationalStatuses.has(status);
}

export function assertAuctionSessionUpdateAllowed(
  session: AuctionSession,
  input: UpdateAuctionSessionInput
): void {
  if (
    session.status === "COMPLETED" ||
    session.status === "CLOSED"
  ) {
    throw new AuctionSessionDomainError(
      "SESSION_READ_ONLY",
      `Auction session "${session.id}" is read-only`
    );
  }

  const hasStructuralChanges =
    input.leagueId !== undefined ||
    input.season !== undefined ||
    input.editionNumber !== undefined;

  if (
    hasStructuralChanges &&
    session.status !== "SETUP"
  ) {
    throw new AuctionSessionDomainError(
      "STRUCTURAL_FIELDS_LOCKED",
      "League, season and edition number can only be changed in SETUP"
    );
  }

  if (
    input.initialCredits !== undefined &&
    !initialCreditsEditableStatuses.has(session.status)
  ) {
    throw new AuctionSessionDomainError(
      "INITIAL_CREDITS_LOCKED",
      `Initial credits cannot be changed in status "${session.status}"`
    );
  }

  if (
    input.maximumInitialRosterEntries !== undefined &&
    session.status !== "SETUP" &&
    session.status !== "READY"
  ) {
    throw new AuctionSessionDomainError(
      "STRUCTURAL_FIELDS_LOCKED",
      `Maximum initial roster entries cannot be changed in status "${session.status}"`
    );
  }
}

export function assertAuctionSessionDeletionAllowed(
  session: AuctionSession
): void {
  if (session.status !== "SETUP") {
    throw new AuctionSessionDomainError(
      "SESSION_DELETE_NOT_ALLOWED",
      `Auction session "${session.id}" can only be deleted in SETUP`
    );
  }
}
