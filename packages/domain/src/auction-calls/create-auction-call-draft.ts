import type {
  PlayerRole
} from "../players/index.js";
import {
  rosterRoleLimits,
  rosterSizeLimit
} from "../roster-entries/index.js";

import type {
  AuctionCall
} from "./auction-call.js";
import type {
  AuctionCallTeam
} from "./auction-call-team.js";
import {
  calculateMaximumBid
} from "./maximum-bid.js";

export type CreateAuctionCallDraftTeamInput = {
  auctionSessionTeamId: string;
  turnOrder: number;
  remainingCredits: number;
  currentRosterSize: number;
  currentRoleCount: number;
};

export type CreateAuctionCallDraftInput = {
  auctionCallId: string;
  auctionSessionId: string;
  playerId: string;
  playerRole: PlayerRole;
  callerAuctionSessionTeamId: string;
  teams: readonly CreateAuctionCallDraftTeamInput[];
  now: string;
};

export type AuctionCallDraftAggregate = {
  call: AuctionCall;
  teams: AuctionCallTeam[];
};

export type CreateAuctionCallDraftDomainErrorCode =
  | "NOT_ENOUGH_TEAMS"
  | "INVALID_TURN_ORDER"
  | "DUPLICATE_TURN_ORDER"
  | "DUPLICATE_AUCTION_SESSION_TEAM"
  | "CALLER_NOT_FOUND"
  | "CALLER_NOT_ELIGIBLE";

export class CreateAuctionCallDraftDomainError
  extends Error
{
  readonly code:
    CreateAuctionCallDraftDomainErrorCode;

  constructor(
    code: CreateAuctionCallDraftDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "CreateAuctionCallDraftDomainError";
    this.code = code;
  }
}

export function createAuctionCallDraft(
  input: CreateAuctionCallDraftInput
): AuctionCallDraftAggregate {
  if (input.teams.length < 2) {
    throw new CreateAuctionCallDraftDomainError(
      "NOT_ENOUGH_TEAMS",
      "An auction call requires at least two teams"
    );
  }

  const turnOrders = new Set<number>();
  const auctionSessionTeamIds =
    new Set<string>();

  const teams = [...input.teams]
    .sort(
      (left, right) =>
        left.turnOrder - right.turnOrder
    )
    .map((team): AuctionCallTeam => {
      if (
        !Number.isInteger(team.turnOrder) ||
        team.turnOrder < 1
      ) {
        throw new CreateAuctionCallDraftDomainError(
          "INVALID_TURN_ORDER",
          "Turn order must be an integer greater than or equal to 1"
        );
      }

      if (turnOrders.has(team.turnOrder)) {
        throw new CreateAuctionCallDraftDomainError(
          "DUPLICATE_TURN_ORDER",
          "Turn order must be unique within an auction call"
        );
      }

      if (
        auctionSessionTeamIds.has(
          team.auctionSessionTeamId
        )
      ) {
        throw new CreateAuctionCallDraftDomainError(
          "DUPLICATE_AUCTION_SESSION_TEAM",
          "An auction session team can appear only once within an auction call"
        );
      }

      turnOrders.add(team.turnOrder);
      auctionSessionTeamIds.add(
        team.auctionSessionTeamId
      );

      if (
        team.currentRosterSize >=
        rosterSizeLimit
      ) {
        return {
          auctionCallId:
            input.auctionCallId,
          auctionSessionTeamId:
            team.auctionSessionTeamId,
          turnOrder:
            team.turnOrder,
          status: "EXCLUDED",
          maximumBid: 0,
          exclusionReason: "ROSTER_FULL"
        };
      }

      const remainingRosterSlots =
        rosterSizeLimit -
        team.currentRosterSize;

      const maximumBid =
        calculateMaximumBid({
          remainingCredits:
            team.remainingCredits,
          remainingRosterSlots
        });

      if (
        team.currentRoleCount >=
        rosterRoleLimits[input.playerRole]
      ) {
        return {
          auctionCallId:
            input.auctionCallId,
          auctionSessionTeamId:
            team.auctionSessionTeamId,
          turnOrder:
            team.turnOrder,
          status: "EXCLUDED",
          maximumBid,
          exclusionReason:
            "ROLE_LIMIT_REACHED"
        };
      }

      return {
        auctionCallId:
          input.auctionCallId,
        auctionSessionTeamId:
          team.auctionSessionTeamId,
        turnOrder:
          team.turnOrder,
        status: "ACTIVE",
        maximumBid,
        exclusionReason: null
      };
    });

  const caller = teams.find(
    (team) =>
      team.auctionSessionTeamId ===
      input.callerAuctionSessionTeamId
  );

  if (!caller) {
    throw new CreateAuctionCallDraftDomainError(
      "CALLER_NOT_FOUND",
      "Caller must belong to the auction call"
    );
  }

  if (caller.status !== "ACTIVE") {
    throw new CreateAuctionCallDraftDomainError(
      "CALLER_NOT_ELIGIBLE",
      "Caller must be eligible for the selected player"
    );
  }

  return {
    call: {
      id:
        input.auctionCallId,
      auctionSessionId:
        input.auctionSessionId,
      playerId:
        input.playerId,
      callerAuctionSessionTeamId:
        input.callerAuctionSessionTeamId,
      status: "DRAFT",
      openingBid: null,
      currentBid: null,
      currentLeaderAuctionSessionTeamId:
        null,
      currentTurnAuctionSessionTeamId:
        null,
      currentTurnStartedAt: null,
      provisionalWinnerAuctionSessionTeamId:
        null,
      createdAt:
        input.now,
      updatedAt:
        input.now
    },
    teams
  };
}
