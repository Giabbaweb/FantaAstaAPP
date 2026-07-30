export const auctionCallStatuses = [
  "DRAFT",
  "OPEN",
  "PROVISIONAL_AWARD",
  "SUSPENDED",
  "CONFIRMED",
  "CANCELLED",
  "ROLLED_BACK"
] as const;

export type AuctionCallStatus =
  (typeof auctionCallStatuses)[number];

export const auctionCallCommands = [
  "open",
  "suspend",
  "resume",
  "provisionalAward",
  "confirm",
  "cancel",
  "rollback"
] as const;

export type AuctionCallCommand =
  (typeof auctionCallCommands)[number];

export type AuctionCall = {
  id: string;
  auctionSessionId: string;
  playerId: string;
  callerAuctionSessionTeamId: string;
  status: AuctionCallStatus;
  openingBid: number | null;
  currentBid: number | null;
  currentLeaderAuctionSessionTeamId: string | null;
  currentTurnAuctionSessionTeamId: string | null;
  provisionalWinnerAuctionSessionTeamId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuctionCallDomainErrorCode =
  "INVALID_STATUS_TRANSITION";

export class AuctionCallDomainError extends Error {
  readonly code: AuctionCallDomainErrorCode;

  constructor(
    code: AuctionCallDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "AuctionCallDomainError";
    this.code = code;
  }
}

const statusTransitions: Record<
  AuctionCallStatus,
  Partial<Record<AuctionCallCommand, AuctionCallStatus>>
> = {
  DRAFT: {
    open: "OPEN",
    cancel: "CANCELLED",
    rollback: "ROLLED_BACK"
  },
  OPEN: {
    suspend: "SUSPENDED",
    provisionalAward: "PROVISIONAL_AWARD",
    cancel: "CANCELLED",
    rollback: "ROLLED_BACK"
  },
  PROVISIONAL_AWARD: {
    confirm: "CONFIRMED",
    rollback: "ROLLED_BACK"
  },
  SUSPENDED: {
    resume: "OPEN",
    cancel: "CANCELLED",
    rollback: "ROLLED_BACK"
  },
  CONFIRMED: {},
  CANCELLED: {},
  ROLLED_BACK: {}
};

export function transitionAuctionCallStatus(
  currentStatus: AuctionCallStatus,
  command: AuctionCallCommand
): AuctionCallStatus {
  const nextStatus =
    statusTransitions[currentStatus][command];

  if (!nextStatus) {
    throw new AuctionCallDomainError(
      "INVALID_STATUS_TRANSITION",
      `Command "${command}" is not allowed from status "${currentStatus}"`
    );
  }

  return nextStatus;
}
