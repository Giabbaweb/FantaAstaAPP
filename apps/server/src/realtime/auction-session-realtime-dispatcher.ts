import type {
  RealtimeAuctionSessionEvent,
  RealtimeAuctionSessionEventType
} from "@fantaastaapp/contracts";

import type {
  RealtimePublisher
} from "./realtime-publisher.js";

type AuctionSessionEventPublisher = Pick<
  RealtimePublisher,
  "publishAuctionEvent"
>;

export type AuctionSessionRealtimeDispatchInput = {
  type: RealtimeAuctionSessionEventType;
  auctionSessionId: string;
  payload?: Record<string, unknown>;
};

export class AuctionSessionRealtimeDispatcher {
  constructor(
    private readonly publisher:
      AuctionSessionEventPublisher,
    private readonly now:
      () => string = () =>
        new Date().toISOString()
  ) {}

  async dispatch(
    input: AuctionSessionRealtimeDispatchInput
  ): Promise<void> {
    const event: RealtimeAuctionSessionEvent = {
      type: input.type,
      auctionSessionId:
        input.auctionSessionId,
      auctionCallId: null,
      occurredAt: this.now(),
      payload:
        input.payload ?? {}
    };

    await this.publisher
      .publishAuctionEvent(event);
  }
}
