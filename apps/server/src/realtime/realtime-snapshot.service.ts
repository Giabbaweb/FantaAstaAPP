import type {
  AuctionSession,
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

import type {
  AuctionCallReader
} from "../repositories/auction-call.repository.js";
import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import type {
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

type AuctionSessionReader = Pick<
  AuctionSessionRepository,
  "findById"
>;

export class RealtimeSnapshotService {
  constructor(
    private readonly sessionReader:
      AuctionSessionReader,
    private readonly sessionTeamReader:
      RealtimeSnapshotTeamReader,
    private readonly auctionCallReader:
      AuctionCallReader,
    private readonly now:
      () => string = () =>
        new Date().toISOString()
  ) {}

  async buildSnapshot(
    auctionSessionId: string,
    stateVersion: number
  ): Promise<RealtimeAuctionSnapshot> {
    if (
      !Number.isInteger(stateVersion) ||
      stateVersion < 0
    ) {
      throw new Error(
        "Realtime state version must be a nonnegative integer"
      );
    }

    const session =
      await this.requireSession(
        auctionSessionId
      );

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
      stateVersion,
      generatedAt: this.now(),
      session,
      sessionTeams,
      operationalAuctionCall
    };
  }

  private async requireSession(
    auctionSessionId: string
  ): Promise<AuctionSession> {
    const session =
      await this.sessionReader.findById(
        auctionSessionId
      );

    if (!session) {
      throw new RealtimeSnapshotServiceError(
        "REALTIME_SNAPSHOT_SESSION_NOT_FOUND",
        `Auction session "${auctionSessionId}" was not found`
      );
    }

    return session;
  }
}
