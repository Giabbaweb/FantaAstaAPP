import type {
  AuctionCallRepository,
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";

export type AuctionCallServiceErrorCode =
  | "AUCTION_CALL_NOT_FOUND";

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
    private readonly repository: AuctionCallRepository
  ) {}

  async getById(
    id: string
  ): Promise<AuctionCallAggregate> {
    return this.requireAuctionCall(id);
  }

  async getOperationalByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionCallAggregate | null> {
    return this.repository.findOperationalByAuctionSessionId(
      auctionSessionId
    );
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
