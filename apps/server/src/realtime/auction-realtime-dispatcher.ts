import type {
  RealtimeAuctionEvent,
  RealtimeAuctionEventType
} from "@fantaastaapp/contracts";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import type {
  RealtimePublisher
} from "./realtime-publisher.js";

export type AuctionRealtimeDispatchInput = {
  type: RealtimeAuctionEventType;
  aggregate: AuctionCallAggregate;
  payload?: Record<string, unknown>;
};

export class AuctionRealtimeDispatcher {
  constructor(
    private readonly publisher:
      RealtimePublisher,
    private readonly now:
      () => string = () =>
        new Date().toISOString()
  ) {}

  async dispatch(
    input: AuctionRealtimeDispatchInput
  ): Promise<void> {
    const event: RealtimeAuctionEvent = {
      type: input.type,
      auctionSessionId:
        input.aggregate.call.auctionSessionId,
      auctionCallId:
        input.aggregate.call.id,
      occurredAt: this.now(),
      payload: {
        aggregate: input.aggregate,
        ...input.payload
      }
    };

    await this.publisher.publishAuctionEvent(
      event
    );
  }
}
