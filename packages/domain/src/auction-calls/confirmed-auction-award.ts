import {
  assertRosterAcquisitionAllowed,
  RosterEntryDomainError
} from "../roster-entries/index.js";
import type {
  PlayerRole
} from "../players/index.js";

import {
  MaximumBidDomainError
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
  try {
    assertRosterAcquisitionAllowed(input);
  } catch (error) {
    if (
      error instanceof RosterEntryDomainError &&
      error.code ===
        "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
    ) {
      throw new MaximumBidDomainError(
        "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER",
        error.message
      );
    }

    throw error;
  }
}
