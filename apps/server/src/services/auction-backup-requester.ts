import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";

export type ConfirmedAwardBackupRequest = {
  auctionSessionId: string;
  auctionCallId: string;
  aggregate: AuctionCallAggregate;
};

export type SuspendedSessionBackupRequest = {
  auctionSessionId: string;
};

export type ManualAssignmentBackupRequest = {
  auctionSessionId: string;
};

export type TechnicalCorrectionBackupRequest = {
  auctionSessionId: string;
};

export interface AuctionBackupRequester {
  requestConfirmedAwardBackup(
    request: ConfirmedAwardBackupRequest
  ): Promise<void>;

  requestSuspendedSessionBackup(
    request: SuspendedSessionBackupRequest
  ): Promise<void>;

  requestManualAssignmentBackup(
    request: ManualAssignmentBackupRequest
  ): Promise<void>;

  requestTechnicalCorrectionBackup(
    request: TechnicalCorrectionBackupRequest
  ): Promise<void>;
}

export class NoopAuctionBackupRequester
  implements AuctionBackupRequester
{
  async requestConfirmedAwardBackup(
    _request: ConfirmedAwardBackupRequest
  ): Promise<void> {
    return;
  }

  async requestSuspendedSessionBackup(
    _request: SuspendedSessionBackupRequest
  ): Promise<void> {
    return;
  }

  async requestManualAssignmentBackup(
    _request: ManualAssignmentBackupRequest
  ): Promise<void> {
    return;
  }

  async requestTechnicalCorrectionBackup(
    _request: TechnicalCorrectionBackupRequest
  ): Promise<void> {
    return;
  }
}
