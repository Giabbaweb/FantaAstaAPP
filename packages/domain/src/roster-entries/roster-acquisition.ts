import type {
  PlayerRole
} from "../players/index.js";
import {
  assertAcquisitionCostAllowed,
  assertRosterRoleLimitAllowed,
  assertRosterSizeLimitAllowed,
  assertSufficientCredits,
  RosterEntryDomainError,
  rosterSizeLimit
} from "./roster-entry.js";

export type RosterAcquisitionValidationInput = {
  playerRole: PlayerRole;
  currentRosterSize: number;
  currentRoleCount: number;
  remainingCredits: number;
  acquisitionCost: number;
};

export function assertRosterAcquisitionAllowed(
  input: RosterAcquisitionValidationInput
): void {
  const {
    playerRole,
    currentRosterSize,
    currentRoleCount,
    remainingCredits,
    acquisitionCost
  } = input;

  assertAcquisitionCostAllowed(
    acquisitionCost
  );

  assertRosterSizeLimitAllowed(
    currentRosterSize
  );

  assertRosterRoleLimitAllowed(
    playerRole,
    currentRoleCount
  );

  assertSufficientCredits(
    remainingCredits,
    acquisitionCost
  );

  const remainingRosterSlots =
    rosterSizeLimit - currentRosterSize;

  const maximumAcquisitionCost =
    remainingCredits -
    remainingRosterSlots +
    1;

  if (
    acquisitionCost >
    maximumAcquisitionCost
  ) {
    throw new RosterEntryDomainError(
      "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER",
      `Acquisition cost "${acquisitionCost}" exceeds maximum sustainable acquisition cost "${maximumAcquisitionCost}"`
    );
  }
}
