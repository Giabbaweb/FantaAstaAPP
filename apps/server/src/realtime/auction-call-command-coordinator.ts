import type {
  RealtimeAuctionEventType,
  RealtimeCommandMetadata
} from "@fantaastaapp/contracts";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import type {
  AtomicAuctionCallCommandService
} from "./atomic-auction-call-command.service.js";
import type {
  ExecuteAtomicAuctionCommandResult
} from "./atomic-auction-command.executor.js";
import type {
  AuctionRealtimeDispatchInput,
  AuctionRealtimeDispatcher
} from "./auction-realtime-dispatcher.js";
import type {
  AuctionSnapshotDispatcher
} from "./auction-snapshot-dispatcher.js";

type AtomicAuctionCallCommandServicePort = Pick<
  AtomicAuctionCallCommandService,
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
      AtomicAuctionCallCommandServicePort,
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
    metadata: RealtimeCommandMetadata,
    openingBid: number
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    const result =
      await this.service.open(
        id,
        metadata,
        openingBid
      );

    await this.synchronizeResult(
      result,
      {
        type: "AUCTION_CALL_OPENED",
        aggregate: result.aggregate,
        payload: {
          openingBid
        }
      }
    );

    return result;
  }

  async placeBid(
    id: string,
    metadata: RealtimeCommandMetadata,
    auctionSessionTeamId: string,
    bid: number
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    const result =
      await this.service.placeBid(
        id,
        metadata,
        auctionSessionTeamId,
        bid
      );

    await this.synchronizeResult(
      result,
      {
        type: "BID_PLACED",
        aggregate: result.aggregate,
        payload: {
          auctionSessionTeamId,
          bid
        }
      }
    );

    return result;
  }

  async passTurn(
    id: string,
    metadata: RealtimeCommandMetadata,
    auctionSessionTeamId: string
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    const result =
      await this.service.passTurn(
        id,
        metadata,
        auctionSessionTeamId
      );

    await this.synchronizeResult(
      result,
      {
        type: "TEAM_PASSED",
        aggregate: result.aggregate,
        payload: {
          auctionSessionTeamId
        }
      }
    );

    return result;
  }

  async undoPass(
    id: string,
    metadata: RealtimeCommandMetadata,
    auctionSessionTeamId: string
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    const result =
      await this.service.undoPass(
        id,
        metadata,
        auctionSessionTeamId
      );

    await this.synchronizeResult(
      result,
      {
        type: "TEAM_PASS_UNDONE",
        aggregate: result.aggregate,
        payload: {
          auctionSessionTeamId
        }
      }
    );

    return result;
  }

  async confirmAuctionCall(
    id: string,
    metadata: RealtimeCommandMetadata
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    const result =
      await this.service
        .confirmAuctionCall(
          id,
          metadata
        );

    await this.synchronizeResult(
      result,
      {
        type: "AUCTION_CALL_CONFIRMED",
        aggregate: result.aggregate
      }
    );

    return result;
  }

  async cancelAuctionCall(
    id: string,
    metadata: RealtimeCommandMetadata
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    const result =
      await this.service
        .cancelAuctionCall(
          id,
          metadata
        );

    await this.synchronizeResult(
      result,
      {
        type: "AUCTION_CALL_CANCELLED",
        aggregate: result.aggregate
      }
    );

    return result;
  }

  private async synchronizeResult(
    result: ExecuteAtomicAuctionCommandResult,
    input: AuctionRealtimeDispatchInput
  ): Promise<void> {
    if (result.idempotentReplay) {
      return;
    }

    await this.synchronizeSafely(input);
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
