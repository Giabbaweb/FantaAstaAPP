import type {
  AuctionSessionStatus
} from "@fantaastaapp/contracts";
import type {
  PlayerRole
} from "../players/index.js";
import {
  assertContractYearAllowed,
  type ContractYear
} from "./roster-entry.js";
import {
  assertRosterAcquisitionAllowed
} from "./roster-acquisition.js";

export type TechnicalRosterCorrectionValidationInput = {
  auctionSessionStatus: AuctionSessionStatus;
  playerRole: PlayerRole;

  /**
   * Stato della squadra destinataria dopo avere escluso
   * dalla simulazione l'eventuale roster entry originale
   * che apparteneva già alla stessa squadra.
   */
  targetRosterSizeBeforeCorrectedEntry: number;
  targetRoleCountBeforeCorrectedEntry: number;

  /**
   * Crediti disponibili per applicare la nuova acquisizione.
   * Se la correzione rimane sulla stessa squadra, il service
   * deve prima riaccreditare logicamente il costo precedente.
   */
  availableCreditsBeforeCorrectedAcquisition: number;

  acquisitionCost: number;
  contractYear: number;
};

export type TechnicalRosterCorrectionDomainErrorCode =
  "TECHNICAL_CORRECTION_NOT_ALLOWED_IN_SESSION_STATUS";

export class TechnicalRosterCorrectionDomainError
  extends Error
{
  readonly code:
    TechnicalRosterCorrectionDomainErrorCode;

  constructor(
    code:
      TechnicalRosterCorrectionDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "TechnicalRosterCorrectionDomainError";
    this.code = code;
  }
}

export function assertTechnicalRosterCorrectionAllowed(
  input: TechnicalRosterCorrectionValidationInput
): asserts input is
  TechnicalRosterCorrectionValidationInput & {
    contractYear: ContractYear;
  } {
  if (
    input.auctionSessionStatus !== "SETUP" &&
    input.auctionSessionStatus !== "READY" &&
    input.auctionSessionStatus !== "SUSPENDED" &&
    input.auctionSessionStatus !== "COMPLETED"
  ) {
    throw new TechnicalRosterCorrectionDomainError(
      "TECHNICAL_CORRECTION_NOT_ALLOWED_IN_SESSION_STATUS",
      `Technical roster correction is not allowed while auction session is "${input.auctionSessionStatus}"`
    );
  }

  assertContractYearAllowed(
    input.contractYear
  );

  assertRosterAcquisitionAllowed({
    playerRole:
      input.playerRole,
    currentRosterSize:
      input.targetRosterSizeBeforeCorrectedEntry,
    currentRoleCount:
      input.targetRoleCountBeforeCorrectedEntry,
    remainingCredits:
      input.availableCreditsBeforeCorrectedAcquisition,
    acquisitionCost:
      input.acquisitionCost
  });
}
