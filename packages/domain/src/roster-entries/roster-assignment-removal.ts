import type {
  AuctionSessionStatus
} from "@fantaastaapp/contracts";

export type RosterAssignmentRemovalValidationInput = {
  auctionSessionStatus: AuctionSessionStatus;
};

export type RosterAssignmentRemovalDomainErrorCode =
  "ROSTER_ASSIGNMENT_REMOVAL_NOT_ALLOWED_IN_SESSION_STATUS";

export class RosterAssignmentRemovalDomainError
  extends Error
{
  readonly code:
    RosterAssignmentRemovalDomainErrorCode;

  constructor(
    code: RosterAssignmentRemovalDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "RosterAssignmentRemovalDomainError";
    this.code = code;
  }
}

export function assertRosterAssignmentRemovalAllowed(
  input: RosterAssignmentRemovalValidationInput
): void {
  if (
    input.auctionSessionStatus !== "SETUP" &&
    input.auctionSessionStatus !== "READY" &&
    input.auctionSessionStatus !== "SUSPENDED" &&
    input.auctionSessionStatus !== "COMPLETED"
  ) {
    throw new RosterAssignmentRemovalDomainError(
      "ROSTER_ASSIGNMENT_REMOVAL_NOT_ALLOWED_IN_SESSION_STATUS",
      `Roster assignment removal is not allowed while auction session is "${input.auctionSessionStatus}"`
    );
  }
}
