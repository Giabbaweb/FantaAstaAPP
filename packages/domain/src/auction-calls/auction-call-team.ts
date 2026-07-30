export const auctionCallTeamStatuses = [
  "ACTIVE",
  "PASSED",
  "EXCLUDED"
] as const;

export type AuctionCallTeamStatus =
  (typeof auctionCallTeamStatuses)[number];

export const auctionCallTeamExclusionReasons = [
  "MAXIMUM_BID_TOO_LOW",
  "ROSTER_FULL",
  "ROLE_LIMIT_REACHED"
] as const;

export type AuctionCallTeamExclusionReason =
  (typeof auctionCallTeamExclusionReasons)[number];

export type AuctionCallTeam = {
  auctionCallId: string;
  auctionSessionTeamId: string;
  turnOrder: number;
  status: AuctionCallTeamStatus;
  maximumBid: number;
  exclusionReason: AuctionCallTeamExclusionReason | null;
};
