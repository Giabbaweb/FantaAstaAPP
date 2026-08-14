import type { PlayerRole } from "../players/index.js";

export const rosterEntrySources = [
  "INITIAL_ROSTER",
  "AUCTION",
  "OPTION",
  "MANUAL_ASSIGNMENT",
  "TECHNICAL_CORRECTION"
] as const;

export type RosterEntrySource =
  (typeof rosterEntrySources)[number];

export const contractYears = [
  1,
  2,
  3
] as const;

export type ContractYear =
  (typeof contractYears)[number];

export type RosterEntry = {
  id: string;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: ContractYear;
  source: RosterEntrySource;
  createdAt: string;
  updatedAt: string;
};

export const rosterRoleLimits: Readonly<
  Record<PlayerRole, number>
> = {
  P: 2,
  D: 8,
  C: 8,
  A: 6
};

export const rosterSizeLimit = 24;

export type RosterEntryDomainErrorCode =
  | "INVALID_ACQUISITION_COST"
  | "INVALID_CONTRACT_YEAR"
  | "ROSTER_ROLE_LIMIT_EXCEEDED"
  | "ROSTER_SIZE_LIMIT_EXCEEDED"
  | "INSUFFICIENT_CREDITS"
  | "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER";

export class RosterEntryDomainError extends Error {
  readonly code: RosterEntryDomainErrorCode;

  constructor(
    code: RosterEntryDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "RosterEntryDomainError";
    this.code = code;
  }
}

export function assertAcquisitionCostAllowed(
  acquisitionCost: number
): void {
  if (
    !Number.isInteger(acquisitionCost) ||
    acquisitionCost < 1
  ) {
    throw new RosterEntryDomainError(
      "INVALID_ACQUISITION_COST",
      "Acquisition cost must be an integer greater than or equal to 1"
    );
  }
}

export function assertContractYearAllowed(
  contractYear: number
): asserts contractYear is ContractYear {
  if (
    !contractYears.includes(
      contractYear as ContractYear
    )
  ) {
    throw new RosterEntryDomainError(
      "INVALID_CONTRACT_YEAR",
      `Contract year "${contractYear}" is not allowed`
    );
  }
}

export function assertRosterRoleLimitAllowed(
  role: PlayerRole,
  currentRoleCount: number
): void {
  const limit = rosterRoleLimits[role];

  if (currentRoleCount >= limit) {
    throw new RosterEntryDomainError(
      "ROSTER_ROLE_LIMIT_EXCEEDED",
      `Roster role limit for "${role}" is ${limit}`
    );
  }
}

export function assertRosterSizeLimitAllowed(
  currentRosterSize: number
): void {
  if (currentRosterSize >= rosterSizeLimit) {
    throw new RosterEntryDomainError(
      "ROSTER_SIZE_LIMIT_EXCEEDED",
      `Roster size limit is ${rosterSizeLimit}`
    );
  }
}

export function assertSufficientCredits(
  remainingCredits: number,
  acquisitionCost: number
): void {
  if (acquisitionCost > remainingCredits) {
    throw new RosterEntryDomainError(
      "INSUFFICIENT_CREDITS",
      `Acquisition cost "${acquisitionCost}" exceeds remaining credits "${remainingCredits}"`
    );
  }
}
