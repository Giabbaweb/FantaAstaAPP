import type {
  RealtimeAuctionCallEvent,
  RealtimeAuctionCallEventType
} from "@fantaastaapp/contracts";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import type {
  RealtimePublisher
} from "./realtime-publisher.js";

type AuctionEventPublisher = Pick<
  RealtimePublisher,
  "publishAuctionEvent"
>;

export type AuctionRealtimeDispatchInput = {
  type: RealtimeAuctionCallEventType;
  aggregate: AuctionCallAggregate;
  payload?: Record<string, unknown>;
};

export class AuctionRealtimeDispatcher {
  constructor(
    private readonly publisher:
      AuctionEventPublisher,
    private readonly now:
      () => string = () =>
        new Date().toISOString()
  ) {}

  async dispatch(
    input: AuctionRealtimeDispatchInput
  ): Promise<void> {
    const event: RealtimeAuctionCallEvent = {
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
