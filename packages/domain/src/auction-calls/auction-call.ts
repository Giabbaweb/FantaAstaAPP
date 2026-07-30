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
