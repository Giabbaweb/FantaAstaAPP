export type MaximumBidInput = {
  remainingCredits: number;
  remainingRosterSlots: number;
};

export type MaximumBidDomainErrorCode =
  | "INVALID_REMAINING_CREDITS"
  | "INVALID_REMAINING_ROSTER_SLOTS";

export class MaximumBidDomainError extends Error {
  readonly code: MaximumBidDomainErrorCode;

  constructor(
    code: MaximumBidDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "MaximumBidDomainError";
    this.code = code;
  }
}

export function calculateMaximumBid(
  input: MaximumBidInput
): number {
  const {
    remainingCredits,
    remainingRosterSlots
  } = input;

  if (
    !Number.isInteger(remainingCredits) ||
    remainingCredits < 0
  ) {
    throw new MaximumBidDomainError(
      "INVALID_REMAINING_CREDITS",
      "Remaining credits must be a non-negative integer"
    );
  }

  if (
    !Number.isInteger(remainingRosterSlots) ||
    remainingRosterSlots < 1
  ) {
    throw new MaximumBidDomainError(
      "INVALID_REMAINING_ROSTER_SLOTS",
      "Remaining roster slots must be an integer greater than or equal to 1"
    );
  }

  return Math.max(
    0,
    remainingCredits - remainingRosterSlots + 1
  );
}
