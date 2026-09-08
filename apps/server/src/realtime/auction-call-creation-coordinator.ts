import type {
  AuctionCallCreationService,
  CreateAuctionCallInput
} from "../services/auction-call-creation.service.js";
import type {
  ExecuteAtomicAuctionCallCreationResult
} from "./atomic-auction-call-creation.executor.js";
import type {
  AuctionSnapshotDispatcher
} from "./auction-snapshot-dispatcher.js";

type AuctionCallCreationServicePort = Pick<
  AuctionCallCreationService,
  "createDraft"
>;

type AuctionSnapshotDispatcherPort = Pick<
  AuctionSnapshotDispatcher,
  "dispatch"
>;

export type AuctionCallCreationDispatchFailure = {
  stage: "SNAPSHOT";
  auctionSessionId: string;
  error: unknown;
};

export type AuctionCallCreationDispatchFailureHandler =
  (
    failure: AuctionCallCreationDispatchFailure
  ) => void;

export class AuctionCallCreationCoordinator {
  constructor(
    private readonly service:
      AuctionCallCreationServicePort,
    private readonly snapshotDispatcher:
      AuctionSnapshotDispatcherPort,
    private readonly onDispatchFailure:
      AuctionCallCreationDispatchFailureHandler =
        () => undefined
  ) {}

  async createDraft(
    input: CreateAuctionCallInput
  ): Promise<ExecuteAtomicAuctionCallCreationResult> {
    const result =
      await this.service.createDraft(input);

    if (!result.idempotentReplay) {
      try {
        await this.snapshotDispatcher.dispatch(
          result.aggregate.call.auctionSessionId
        );
      } catch (error) {
        this.onDispatchFailure({
          stage: "SNAPSHOT",
          auctionSessionId:
            result.aggregate.call.auctionSessionId,
          error
        });
      }
    }

    return result;
  }
}
