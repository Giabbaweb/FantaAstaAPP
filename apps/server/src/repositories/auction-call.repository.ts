import type {
  AuctionCall,
  AuctionCallTeam
} from "@fantaastaapp/domain";

export type AuctionCallAggregate = {
  call: AuctionCall;
  teams: AuctionCallTeam[];
};

export interface AuctionCallRepository {
  findById(
    id: string
  ): Promise<AuctionCallAggregate | null>;

  findOperationalByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionCallAggregate | null>;

  create(
    aggregate: AuctionCallAggregate
  ): Promise<AuctionCallAggregate>;

  update(
    aggregate: AuctionCallAggregate
  ): Promise<AuctionCallAggregate | null>;

  delete(id: string): Promise<boolean>;
}
