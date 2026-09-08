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
  constructor(
    private readonly now:
      () => string =
        () => new Date().toISOString()
  ) {}

  private applyTurnStartedAt(
    before: AuctionCallAggregate,
    after: AuctionCallAggregate
  ): AuctionCallAggregate {
    const previousTurn =
      before.call
        .currentTurnAuctionSessionTeamId;

    const nextTurn =
      after.call
        .currentTurnAuctionSessionTeamId;

    if (previousTurn === nextTurn) {
      return after;
    }

    return {
      ...after,
      call: {
        ...after.call,
        currentTurnStartedAt:
          nextTurn === null
            ? null
            : this.now()
      }
    };
  }

  open(
    aggregate: AuctionCallAggregate,
    openingBid: number
  ): AuctionCallAggregate {
    const opened = openAuctionCall({
      auctionCall: aggregate.call,
      teams: aggregate.teams,
      openingBid
    });

    return this.applyTurnStartedAt(
      aggregate,
      {
        call: opened.auctionCall,
        teams: opened.teams
      }
    );
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

    return this.applyTurnStartedAt(
      aggregate,
      {
        call: updated.auctionCall,
        teams: updated.teams
      }
    );
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

    return this.applyTurnStartedAt(
      aggregate,
      {
        call: updated.auctionCall,
        teams: updated.teams
      }
    );
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

    return this.applyTurnStartedAt(
      aggregate,
      {
        call: updated.auctionCall,
        teams: updated.teams
      }
    );
  }

  confirmAuctionCall(
    aggregate: AuctionCallAggregate
  ): AuctionCallAggregate {
    const confirmed =
      confirmAuctionCallDomain({
        auctionCall: aggregate.call
      });

    return this.applyTurnStartedAt(
      aggregate,
      {
        call: confirmed.auctionCall,
        teams: aggregate.teams
      }
    );
  }

  cancelAuctionCall(
    aggregate: AuctionCallAggregate
  ): AuctionCallAggregate {
    const cancelled =
      cancelAuctionCallDomain({
        auctionCall: aggregate.call
      });

    return this.applyTurnStartedAt(
      aggregate,
      {
        call: cancelled.auctionCall,
        teams: aggregate.teams
      }
    );
  }
}
