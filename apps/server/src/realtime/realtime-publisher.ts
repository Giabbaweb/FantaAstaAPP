import type {
  RealtimeAuctionEvent
} from "@fantaastaapp/contracts";

export type {
  RealtimeAuctionEvent,
  RealtimeAuctionEventType
} from "@fantaastaapp/contracts";

export interface RealtimePublisher {
  publishAuctionEvent(
    event: RealtimeAuctionEvent
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
}
