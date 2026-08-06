import {
  cancelAuctionCall as cancelAuctionCallDomain,
  confirmAuctionCall as confirmAuctionCallDomain,
  openAuctionCall,
  passTurn,
  placeBid,
  undoPass
} from "@fantaastaapp/domain";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";

export class AuctionCallCommandHandler {
  open(
    aggregate: AuctionCallAggregate,
    openingBid: number
  ): AuctionCallAggregate {
    const opened = openAuctionCall({
      auctionCall: aggregate.call,
      teams: aggregate.teams,
      openingBid
    });

    return {
      call: opened.auctionCall,
      teams: opened.teams
    };
  }

  placeBid(
    aggregate: AuctionCallAggregate,
    auctionSessionTeamId: string,
    bid: number
  ): AuctionCallAggregate {
    const updated = placeBid({
      auctionCall: aggregate.call,
      teams: aggregate.teams,
      auctionSessionTeamId,
      bid
    });

    return {
      call: updated.auctionCall,
      teams: updated.teams
    };
  }

  passTurn(
    aggregate: AuctionCallAggregate,
    auctionSessionTeamId: string
  ): AuctionCallAggregate {
    const updated = passTurn({
      auctionCall: aggregate.call,
      teams: aggregate.teams,
      auctionSessionTeamId
    });

    return {
      call: updated.auctionCall,
      teams: updated.teams
    };
  }

  undoPass(
    aggregate: AuctionCallAggregate,
    auctionSessionTeamId: string
  ): AuctionCallAggregate {
    const updated = undoPass({
      auctionCall: aggregate.call,
      teams: aggregate.teams,
      auctionSessionTeamId
    });

    return {
      call: updated.auctionCall,
      teams: updated.teams
    };
  }

  confirmAuctionCall(
    aggregate: AuctionCallAggregate
  ): AuctionCallAggregate {
    const confirmed =
      confirmAuctionCallDomain({
        auctionCall: aggregate.call
      });

    return {
      call: confirmed.auctionCall,
      teams: aggregate.teams
    };
  }

  cancelAuctionCall(
    aggregate: AuctionCallAggregate
  ): AuctionCallAggregate {
    const cancelled =
      cancelAuctionCallDomain({
        auctionCall: aggregate.call
      });

    return {
      call: cancelled.auctionCall,
      teams: aggregate.teams
    };
  }
}
