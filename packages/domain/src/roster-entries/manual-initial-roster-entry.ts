import type {
  AuctionSessionStatus
} from "@fantaastaapp/contracts";

import type {
  PlayerRole
} from "../players/index.js";
import {
  assertRosterAcquisitionAllowed
} from "./roster-acquisition.js";
import {
  assertContractYearAllowed
} from "./roster-entry.js";

export const manualInitialRosterAllowedStatuses:
  ReadonlySet<AuctionSessionStatus> =
    new Set([
      "SETUP",
      "READY",
      "SUSPENDED",
      "COMPLETED"
    ]);

export type ManualInitialRosterEntryDomainErrorCode =
  | "INITIAL_ROSTER_LIMIT_EXCEEDED"
  | "INVALID_INITIAL_ROSTER_LIMIT"
  | "MANUAL_INITIAL_ROSTER_NOT_ALLOWED_IN_STATUS";

export class ManualInitialRosterEntryDomainError
  extends Error {
  readonly code:
    ManualInitialRosterEntryDomainErrorCode;

  constructor(
    code: ManualInitialRosterEntryDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "ManualInitialRosterEntryDomainError";
    this.code = code;
  }
}

export type ManualInitialRosterEntryValidationInput = {
  auctionSessionStatus: AuctionSessionStatus;
  currentInitialRosterCount: number;
  maximumInitialRosterEntries: number;
  playerRole: PlayerRole;
  currentRosterSize: number;
  currentRoleCount: number;
  remainingCredits: number;
  acquisitionCost: number;
  contractYear: number;
};

export function assertManualInitialRosterEntryAllowed(
  input: ManualInitialRosterEntryValidationInput
): void {
  if (
    !manualInitialRosterAllowedStatuses.has(
      input.auctionSessionStatus
    )
  ) {
    throw new ManualInitialRosterEntryDomainError(
      "MANUAL_INITIAL_ROSTER_NOT_ALLOWED_IN_STATUS",
      `Manual initial roster entry is not allowed in status "${input.auctionSessionStatus}"`
    );
  }

  if (
    !Number.isInteger(
      input.maximumInitialRosterEntries
    ) ||
    input.maximumInitialRosterEntries < 0
  ) {
    throw new ManualInitialRosterEntryDomainError(
      "INVALID_INITIAL_ROSTER_LIMIT",
      "Maximum initial roster entries must be a non-negative integer"
    );
  }

  if (
    input.currentInitialRosterCount >=
    input.maximumInitialRosterEntries
  ) {
    throw new ManualInitialRosterEntryDomainError(
      "INITIAL_ROSTER_LIMIT_EXCEEDED",
      `Initial roster entry limit is ${input.maximumInitialRosterEntries}`
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
