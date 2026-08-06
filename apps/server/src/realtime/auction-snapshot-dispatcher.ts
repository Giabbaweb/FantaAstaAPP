import type {
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

import type {
  RealtimeSnapshotService
} from "./realtime-snapshot.service.js";
import type {
  RealtimePublisher
} from "./realtime-publisher.js";

type RealtimeSnapshotBuilder = Pick<
  RealtimeSnapshotService,
  "buildSnapshot"
>;

type AuctionSnapshotPublisher = Pick<
  RealtimePublisher,
  "publishAuctionSnapshot"
>;

export class AuctionSnapshotDispatcher {
  constructor(
    private readonly snapshotService:
      RealtimeSnapshotBuilder,
    private readonly publisher:
      AuctionSnapshotPublisher
  ) {}

  async dispatch(
    auctionSessionId: string
  ): Promise<RealtimeAuctionSnapshot> {
    const snapshot =
      await this.snapshotService
        .buildSnapshot(
          auctionSessionId
        );

    await this.publisher
      .publishAuctionSnapshot(snapshot);

    return snapshot;
  }
}
