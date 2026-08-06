import type {
  AuctionCallAggregate,
  AuctionCallRepository
} from "../repositories/auction-call.repository.js";
import {
  AuctionCallCommandHandler
} from "./auction-call-command-handler.js";

export type AuctionCallServiceErrorCode =
  | "AUCTION_CALL_NOT_FOUND"
  | "AUCTION_CALL_SAVE_FAILED";

export class AuctionCallServiceError extends Error {
  readonly code: AuctionCallServiceErrorCode;

  constructor(
    code: AuctionCallServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "AuctionCallServiceError";
    this.code = code;
  }
}

export class AuctionCallService {
  constructor(
    private readonly repository:
      AuctionCallRepository,
    private readonly commandHandler:
      AuctionCallCommandHandler =
        new AuctionCallCommandHandler()
  ) {}

  async getById(
    id: string
  ): Promise<AuctionCallAggregate> {
    return this.requireAuctionCall(id);
  }

  async getOperationalByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionCallAggregate | null> {
    return this.repository
      .findOperationalByAuctionSessionId(
        auctionSessionId
      );
  }

  async open(
    id: string,
    openingBid: number
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.requireAuctionCall(id);

    return this.saveAuctionCall(
      id,
      this.commandHandler.open(
        aggregate,
        openingBid
      )
    );
  }

  async placeBid(
    id: string,
    auctionSessionTeamId: string,
    bid: number
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.requireAuctionCall(id);

    return this.saveAuctionCall(
      id,
      this.commandHandler.placeBid(
        aggregate,
        auctionSessionTeamId,
        bid
      )
    );
  }

  async passTurn(
    id: string,
    auctionSessionTeamId: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.requireAuctionCall(id);

    return this.saveAuctionCall(
      id,
      this.commandHandler.passTurn(
        aggregate,
        auctionSessionTeamId
      )
    );
  }

  async undoPass(
    id: string,
    auctionSessionTeamId: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.requireAuctionCall(id);

    return this.saveAuctionCall(
      id,
      this.commandHandler.undoPass(
        aggregate,
        auctionSessionTeamId
      )
    );
  }

  async confirmAuctionCall(
    id: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.requireAuctionCall(id);

    return this.saveAuctionCall(
      id,
      this.commandHandler
        .confirmAuctionCall(aggregate)
    );
  }

  async cancelAuctionCall(
    id: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.requireAuctionCall(id);

    return this.saveAuctionCall(
      id,
      this.commandHandler
        .cancelAuctionCall(aggregate)
    );
  }

  private async saveAuctionCall(
    id: string,
    aggregate: AuctionCallAggregate
  ): Promise<AuctionCallAggregate> {
    try {
      return await this.repository.save(
        aggregate
      );
    } catch (error) {
      throw new AuctionCallServiceError(
        "AUCTION_CALL_SAVE_FAILED",
        error instanceof Error
          ? `Failed to save auction call "${id}": ${error.message}`
          : `Failed to save auction call "${id}"`
      );
    }
  }

  private async requireAuctionCall(
    id: string
  ): Promise<AuctionCallAggregate> {
    const aggregate =
      await this.repository.findById(id);

    if (!aggregate) {
      throw new AuctionCallServiceError(
        "AUCTION_CALL_NOT_FOUND",
        `Auction call "${id}" was not found`
      );
    }

    return aggregate;
  }
}
