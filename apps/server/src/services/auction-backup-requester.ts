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

export interface AuctionBackupRequester {
  requestConfirmedAwardBackup(
    request: ConfirmedAwardBackupRequest
  ): Promise<void>;

  requestSuspendedSessionBackup(
    request: SuspendedSessionBackupRequest
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
}
