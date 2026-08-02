import type {
  RealtimeAuctionEventType
} from "@fantaastaapp/contracts";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import type {
  AuctionCallService
} from "../services/auction-call.service.js";
import type {
  AuctionRealtimeDispatchInput,
  AuctionRealtimeDispatcher
} from "./auction-realtime-dispatcher.js";
import type {
  AuctionSnapshotDispatcher
} from "./auction-snapshot-dispatcher.js";

type AuctionCallCommandService = Pick<
  AuctionCallService,
  | "open"
  | "placeBid"
  | "passTurn"
  | "undoPass"
  | "confirmAuctionCall"
  | "cancelAuctionCall"
>;

type AuctionRealtimeDispatcherPort = Pick<
  AuctionRealtimeDispatcher,
  "dispatch"
>;

type AuctionSnapshotDispatcherPort = Pick<
  AuctionSnapshotDispatcher,
  "dispatch"
>;

export type AuctionRealtimeDispatchFailure = {
  stage: "EVENT" | "SNAPSHOT";
  type: RealtimeAuctionEventType;
  aggregate: AuctionCallAggregate;
  error: unknown;
};

export type AuctionRealtimeDispatchFailureHandler = (
  failure: AuctionRealtimeDispatchFailure
) => void;

export class AuctionCallCommandCoordinator {
  constructor(
    private readonly service:
      AuctionCallCommandService,
    private readonly dispatcher:
      AuctionRealtimeDispatcherPort,
    private readonly snapshotDispatcher:
      AuctionSnapshotDispatcherPort,
    private readonly onDispatchFailure:
      AuctionRealtimeDispatchFailureHandler =
        () => undefined
  ) {}

  async open(
    id: string,
    openingBid: number
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.service.open(
        id,
        openingBid
      );

    await this.synchronizeSafely({
      type: "AUCTION_CALL_OPENED",
      aggregate,
      payload: {
        openingBid
      }
    });

    return aggregate;
  }

  async placeBid(
    id: string,
    auctionSessionTeamId: string,
    bid: number
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.service.placeBid(
        id,
        auctionSessionTeamId,
        bid
      );

    await this.synchronizeSafely({
      type: "BID_PLACED",
      aggregate,
      payload: {
        auctionSessionTeamId,
        bid
      }
    });

    return aggregate;
  }

  async passTurn(
    id: string,
    auctionSessionTeamId: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.service.passTurn(
        id,
        auctionSessionTeamId
      );

    await this.synchronizeSafely({
      type: "TEAM_PASSED",
      aggregate,
      payload: {
        auctionSessionTeamId
      }
    });

    return aggregate;
  }

  async undoPass(
    id: string,
    auctionSessionTeamId: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.service.undoPass(
        id,
        auctionSessionTeamId
      );

    await this.synchronizeSafely({
      type: "TEAM_PASS_UNDONE",
      aggregate,
      payload: {
        auctionSessionTeamId
      }
    });

    return aggregate;
  }

  async confirmAuctionCall(
    id: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.service
        .confirmAuctionCall(id);

    await this.synchronizeSafely({
      type: "AUCTION_CALL_CONFIRMED",
      aggregate
    });

    return aggregate;
  }

  async cancelAuctionCall(
    id: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.service
        .cancelAuctionCall(id);

    await this.synchronizeSafely({
      type: "AUCTION_CALL_CANCELLED",
      aggregate
    });

    return aggregate;
  }

  private async synchronizeSafely(
    input: AuctionRealtimeDispatchInput
  ): Promise<void> {
    try {
      await this.dispatcher.dispatch(input);
    } catch (error) {
      this.onDispatchFailure({
        stage: "EVENT",
        type: input.type,
        aggregate: input.aggregate,
        error
      });
    }

    try {
      await this.snapshotDispatcher.dispatch(
        input.aggregate.call.auctionSessionId
      );
    } catch (error) {
      this.onDispatchFailure({
        stage: "SNAPSHOT",
        type: input.type,
        aggregate: input.aggregate,
        error
      });
    }
  }
}
