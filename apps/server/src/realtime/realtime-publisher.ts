export type RealtimeAuctionEventType =
  | "AUCTION_CALL_OPENED"
  | "BID_PLACED"
  | "TEAM_PASSED"
  | "TEAM_PASS_UNDONE"
  | "AUCTION_CALL_CONFIRMED"
  | "AUCTION_CALL_CANCELLED";

export type RealtimeAuctionEvent = {
  type: RealtimeAuctionEventType;
  auctionSessionId: string;
  auctionCallId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

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
