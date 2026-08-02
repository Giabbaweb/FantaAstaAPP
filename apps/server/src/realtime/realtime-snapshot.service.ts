import type {
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

import type {
  AuctionCallReader
} from "../repositories/auction-call.repository.js";
import type {
  RealtimeSnapshotSessionReader,
  RealtimeSnapshotTeamReader
} from "./realtime-snapshot.repository.js";

export type RealtimeSnapshotServiceErrorCode =
  "REALTIME_SNAPSHOT_SESSION_NOT_FOUND";

export class RealtimeSnapshotServiceError
  extends Error
{
  readonly code:
    RealtimeSnapshotServiceErrorCode;

  constructor(
    code: RealtimeSnapshotServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "RealtimeSnapshotServiceError";

    this.code = code;
  }
}

export class RealtimeSnapshotService {
  constructor(
    private readonly sessionReader:
      RealtimeSnapshotSessionReader,
    private readonly sessionTeamReader:
      RealtimeSnapshotTeamReader,
    private readonly auctionCallReader:
      AuctionCallReader,
    private readonly now:
      () => string = () =>
        new Date().toISOString()
  ) {}

  async buildSnapshot(
    auctionSessionId: string
  ): Promise<RealtimeAuctionSnapshot> {
    const sessionState =
      await this.sessionReader.findById(
        auctionSessionId
      );

    if (!sessionState) {
      throw new RealtimeSnapshotServiceError(
        "REALTIME_SNAPSHOT_SESSION_NOT_FOUND",
        `Auction session "${auctionSessionId}" was not found`
      );
    }

    const [
      sessionTeams,
      operationalAuctionCall
    ] = await Promise.all([
      this.sessionTeamReader
        .findByAuctionSessionId(
          auctionSessionId
        ),

      this.auctionCallReader
        .findOperationalByAuctionSessionId(
          auctionSessionId
        )
    ]);

    return {
      stateVersion:
        sessionState.stateVersion,
      generatedAt: this.now(),
      session: sessionState.session,
      sessionTeams,
      operationalAuctionCall
    };
  }
}
