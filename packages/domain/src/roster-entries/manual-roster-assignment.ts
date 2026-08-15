import type {
  AuctionSessionStatus
} from "@fantaastaapp/contracts";
import type {
  PlayerRole
} from "../players/index.js";
import {
  assertContractYearAllowed,
  type ContractYear
} from "./roster-entry.js";
import {
  assertRosterAcquisitionAllowed
} from "./roster-acquisition.js";

export const manualRosterAssignmentReasons = [
  "OPTION_EXERCISED_MANUALLY",
  "OPTION_NO_EXTERNAL_BID",
  "TECHNICAL_CORRECTION",
  "OTHER"
] as const;

export type ManualRosterAssignmentReason =
  (typeof manualRosterAssignmentReasons)[number];

export type ManualRosterAssignmentValidationInput = {
  auctionSessionStatus: AuctionSessionStatus;
  playerRole: PlayerRole;
  currentRosterSize: number;
  currentRoleCount: number;
  remainingCredits: number;
  acquisitionCost: number;
  contractYear: number;
};

export type ManualRosterAssignmentDomainErrorCode =
  "MANUAL_ASSIGNMENT_NOT_ALLOWED_IN_SESSION_STATUS";

export class ManualRosterAssignmentDomainError
  extends Error
{
  readonly code:
    ManualRosterAssignmentDomainErrorCode;

  constructor(
    code: ManualRosterAssignmentDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "ManualRosterAssignmentDomainError";
    this.code = code;
  }
}

export function assertManualRosterAssignmentAllowed(
  input: ManualRosterAssignmentValidationInput
): asserts input is
  ManualRosterAssignmentValidationInput & {
    contractYear: ContractYear;
  } {
  if (
    input.auctionSessionStatus !== "SETUP" &&
    input.auctionSessionStatus !== "READY" &&
    input.auctionSessionStatus !== "SUSPENDED" &&
    input.auctionSessionStatus !== "COMPLETED"
  ) {
    throw new ManualRosterAssignmentDomainError(
      "MANUAL_ASSIGNMENT_NOT_ALLOWED_IN_SESSION_STATUS",
      `Manual roster assignment is not allowed while auction session is "${input.auctionSessionStatus}"`
    );
  }

  assertContractYearAllowed(
    input.contractYear
  );

  assertRosterAcquisitionAllowed({
    playerRole:
      input.playerRole,
    currentRosterSize:
      input.currentRosterSize,
    currentRoleCount:
      input.currentRoleCount,
    remainingCredits:
      input.remainingCredits,
    acquisitionCost:
      input.acquisitionCost
  });
}
