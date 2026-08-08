import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";

export type ConfirmedAwardBackupRequest = {
  auctionSessionId: string;
  auctionCallId: string;
  aggregate: AuctionCallAggregate;
};

export interface AuctionBackupRequester {
  requestConfirmedAwardBackup(
    request: ConfirmedAwardBackupRequest
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
}
