export const APPLICATION_NAME = "FantaAstaAPP";

export {
  AuctionCallDomainError,
  MaximumBidDomainError,
  OpenAuctionCallDomainError,
  PassTurnDomainError,
  PlaceBidDomainError,
  auctionCallCommands,
  auctionCallStatuses,
  auctionCallTeamExclusionReasons,
  auctionCallTeamStatuses,
  CancelAuctionCallDomainError,
  ConfirmAuctionCallDomainError,
  CreateAuctionCallDraftDomainError,
  assertConfirmedAuctionAwardAllowed,
  createAuctionCallDraft,
  cancelAuctionCall,
  confirmAuctionCall,
  calculateMaximumBid,
  openAuctionCall,
  passTurn,
  placeBid,
  UndoPassDomainError,
  undoPass,
  transitionAuctionCallStatus
} from "./auction-calls/index.js";

export type {
  AuctionCall,
  AuctionCallCommand,
  AuctionCallDomainErrorCode,
  AuctionCallStatus,
  AuctionCallTeam,
  AuctionCallTeamExclusionReason,
  AuctionCallTeamStatus,
  AuctionCallDraftAggregate,
  CreateAuctionCallDraftDomainErrorCode,
  CreateAuctionCallDraftInput,
  CreateAuctionCallDraftTeamInput,
  MaximumBidDomainErrorCode,
  MaximumBidInput,
  OpenAuctionCallDomainErrorCode,
  OpenAuctionCallInput,
  OpenAuctionCallResult,
  PassTurnDomainErrorCode,
  PassTurnInput,
  PassTurnResult,
  UndoPassDomainErrorCode,
  UndoPassInput,
  UndoPassResult,
  CancelAuctionCallDomainErrorCode,
  CancelAuctionCallInput,
  CancelAuctionCallResult,
  ConfirmAuctionCallDomainErrorCode,
  ConfirmAuctionCallInput,
  ConfirmAuctionCallResult,
  ConfirmedAuctionAwardInput,
  PlaceBidDomainErrorCode,
  PlaceBidInput,
  PlaceBidResult
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
  assertManualInitialRosterEntryAllowed,
  assertManualRosterAssignmentAllowed,
  assertTechnicalRosterCorrectionAllowed,
  assertRosterAssignmentRemovalAllowed,
  assertRosterAcquisitionAllowed,
  manualInitialRosterAllowedStatuses,
  manualRosterAssignmentReasons,
  ManualInitialRosterEntryDomainError,
  ManualRosterAssignmentDomainError,
  TechnicalRosterCorrectionDomainError,
  RosterAssignmentRemovalDomainError,
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
  ManualInitialRosterEntryDomainErrorCode,
  ManualInitialRosterEntryValidationInput,
  ManualRosterAssignmentDomainErrorCode,
  ManualRosterAssignmentReason,
  ManualRosterAssignmentValidationInput,
  TechnicalRosterCorrectionDomainErrorCode,
  TechnicalRosterCorrectionValidationInput,
  RosterAssignmentRemovalDomainErrorCode,
  RosterAssignmentRemovalValidationInput,
  RosterAcquisitionValidationInput,
  RosterEntry,
  RosterEntryDomainErrorCode,
  RosterEntrySource
} from "./roster-entries/index.js";
