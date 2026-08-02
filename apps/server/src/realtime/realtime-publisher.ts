import type {
  RealtimeAuctionEvent,
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

export type {
  RealtimeAuctionEvent,
  RealtimeAuctionEventType,
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

export interface RealtimePublisher {
  publishAuctionEvent(
    event: RealtimeAuctionEvent
  ): Promise<void>;

  publishAuctionSnapshot(
    snapshot: RealtimeAuctionSnapshot
  ): Promise<void>;
}

export class NoopRealtimePublisher
  implements RealtimePublisher
{
  async publishAuctionEvent(
    _event: RealtimeAuctionEvent
  ): Promise<void> {
    return Promise.resolve();
  }

  async publishAuctionSnapshot(
    _snapshot: RealtimeAuctionSnapshot
  ): Promise<void> {
    return Promise.resolve();
  }
}
