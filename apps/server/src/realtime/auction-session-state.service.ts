import type {
  AuctionSessionStateRepository
} from "./auction-session-state.repository.js";

export type AuctionSessionStateServiceErrorCode =
  | "AUCTION_SESSION_STATE_NOT_FOUND"
  | "STALE_STATE";

export class AuctionSessionStateServiceError
  extends Error
{
  readonly code:
    AuctionSessionStateServiceErrorCode;

  constructor(
    code: AuctionSessionStateServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AuctionSessionStateServiceError";
    this.code = code;
  }
}

export class AuctionSessionStateService {
  constructor(
    private readonly repository:
      AuctionSessionStateRepository
  ) {}

  async getStateVersion(
    auctionSessionId: string
  ): Promise<number> {
    const state =
      await this.requireState(
        auctionSessionId
      );

    return state.stateVersion;
  }

  async assertExpectedVersion(
    auctionSessionId: string,
    expectedStateVersion: number
  ): Promise<void> {
    const state =
      await this.requireState(
        auctionSessionId
      );

    if (
      state.stateVersion !==
        expectedStateVersion
    ) {
      throw this.createStaleStateError(
        auctionSessionId,
        expectedStateVersion,
        state.stateVersion
      );
    }
  }

  async incrementStateVersion(
    auctionSessionId: string,
    expectedStateVersion: number
  ): Promise<number> {
    const nextStateVersion =
      await this.repository
        .incrementStateVersionIfMatches(
          auctionSessionId,
          expectedStateVersion
        );

    if (nextStateVersion !== null) {
      return nextStateVersion;
    }

    const currentStateVersion =
      await this.repository
        .getCurrentStateVersion(
          auctionSessionId
        );

    if (currentStateVersion === null) {
      throw new AuctionSessionStateServiceError(
        "AUCTION_SESSION_STATE_NOT_FOUND",
        `Auction session state "${auctionSessionId}" was not found`
      );
    }

    throw this.createStaleStateError(
      auctionSessionId,
      expectedStateVersion,
      currentStateVersion
    );
  }

  private async requireState(
    auctionSessionId: string
  ) {
    const state =
      await this.repository
        .findByAuctionSessionId(
          auctionSessionId
        );

    if (!state) {
      throw new AuctionSessionStateServiceError(
        "AUCTION_SESSION_STATE_NOT_FOUND",
        `Auction session state "${auctionSessionId}" was not found`
      );
    }

    return state;
  }

  private createStaleStateError(
    auctionSessionId: string,
    expectedStateVersion: number,
    currentStateVersion: number
  ): AuctionSessionStateServiceError {
    return new AuctionSessionStateServiceError(
      "STALE_STATE",
      `Auction session "${auctionSessionId}" expected state version ${expectedStateVersion}, but current version is ${currentStateVersion}`
    );
  }
}
