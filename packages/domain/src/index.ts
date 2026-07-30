export const APPLICATION_NAME = "FantaAstaAPP";

export {
  AuctionCallDomainError,
  MaximumBidDomainError,
  auctionCallCommands,
  auctionCallStatuses,
  calculateMaximumBid,
  transitionAuctionCallStatus
} from "./auction-calls/index.js";

export type {
  AuctionCall,
  AuctionCallCommand,
  AuctionCallDomainErrorCode,
  AuctionCallStatus,
  MaximumBidDomainErrorCode,
  MaximumBidInput
} from "./auction-calls/index.js";

export type { League } from "./leagues/index.js";
export type { Team } from "./teams/index.js";

export {
  AuctionSessionDomainError,
  assertAuctionSessionDeletionAllowed,
  assertAuctionSessionUpdateAllowed,
  auctionSessionCommands,
  isOperationalAuctionSessionStatus,
  transitionAuctionSessionStatus
} from "./auction-sessions/index.js";

export type {
  AuctionSessionCommand,
  AuctionSessionDomainErrorCode
} from "./auction-sessions/index.js";
export type {
  Owner,
  TeamOwner
} from "./owners/index.js";

export type {
  AuctionSessionTeam
} from "./auction-session-teams/index.js";

export {
  normalizePlayerName,
  normalizePlayerRole,
  playerAvailabilityStatuses,
  playerRoles
} from "./players/index.js";

export type {
  Player,
  PlayerAvailabilityStatus,
  PlayerRole
} from "./players/index.js";

export {
  RosterEntryDomainError,
  assertAcquisitionCostAllowed,
  assertContractYearAllowed,
  assertRosterRoleLimitAllowed,
  assertRosterSizeLimitAllowed,
  assertSufficientCredits,
  contractYears,
  rosterEntrySources,
  rosterRoleLimits,
  rosterSizeLimit
} from "./roster-entries/index.js";

export type {
  ContractYear,
  RosterEntry,
  RosterEntryDomainErrorCode,
  RosterEntrySource
} from "./roster-entries/index.js";
