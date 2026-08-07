import {
  assertAcquisitionCostAllowed,
  assertRosterRoleLimitAllowed,
  assertRosterSizeLimitAllowed,
  assertSufficientCredits,
  rosterSizeLimit
} from "../roster-entries/index.js";
import type {
  PlayerRole
} from "../players/index.js";

import {
  MaximumBidDomainError,
  calculateMaximumBid
} from "./maximum-bid.js";

export type ConfirmedAuctionAwardInput = {
  playerRole: PlayerRole;
  currentRosterSize: number;
  currentRoleCount: number;
  remainingCredits: number;
  acquisitionCost: number;
};

export function assertConfirmedAuctionAwardAllowed(
  input: ConfirmedAuctionAwardInput
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

  const maximumBid = calculateMaximumBid({
    remainingCredits,
    remainingRosterSlots
  });

  if (acquisitionCost > maximumBid) {
    throw new MaximumBidDomainError(
      "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER",
      `Acquisition cost "${acquisitionCost}" exceeds maximum sustainable bid "${maximumBid}"`
    );
  }
}
