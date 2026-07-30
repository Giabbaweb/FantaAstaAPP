import {
  transitionAuctionCallStatus
} from "./auction-call.js";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

export type OpenAuctionCallInput = {
  auctionCall: AuctionCall;
  teams: readonly AuctionCallTeam[];
  openingBid: number;
};

export type OpenAuctionCallResult = {
  auctionCall: AuctionCall;
  teams: AuctionCallTeam[];
};

export type OpenAuctionCallDomainErrorCode =
  | "INVALID_OPENING_BID"
  | "NOT_ENOUGH_AUCTION_CALL_TEAMS"
  | "INVALID_TURN_ORDER"
  | "DUPLICATE_TURN_ORDER"
  | "DUPLICATE_AUCTION_SESSION_TEAM"
  | "CALLER_NOT_FOUND"
  | "CALLER_NOT_ACTIVE"
  | "CALLER_MAXIMUM_BID_TOO_LOW";

export class OpenAuctionCallDomainError extends Error {
  readonly code: OpenAuctionCallDomainErrorCode;

  constructor(
    code: OpenAuctionCallDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "OpenAuctionCallDomainError";
    this.code = code;
  }
}

export function openAuctionCall(
  input: OpenAuctionCallInput
): OpenAuctionCallResult {
  const {
    auctionCall,
    teams,
    openingBid
  } = input;

  if (!Number.isInteger(openingBid) || openingBid < 1) {
    throw new OpenAuctionCallDomainError(
      "INVALID_OPENING_BID",
      "Opening bid must be an integer greater than or equal to 1"
    );
  }

  if (teams.length < 2) {
    throw new OpenAuctionCallDomainError(
      "NOT_ENOUGH_AUCTION_CALL_TEAMS",
      "An auction call requires at least two teams"
    );
  }

  const turnOrders = new Set<number>();
  const auctionSessionTeamIds = new Set<string>();

  for (const team of teams) {
    if (
      !Number.isInteger(team.turnOrder) ||
      team.turnOrder < 0
    ) {
      throw new OpenAuctionCallDomainError(
        "INVALID_TURN_ORDER",
        "Turn order must be a non-negative integer"
      );
    }

    if (turnOrders.has(team.turnOrder)) {
      throw new OpenAuctionCallDomainError(
        "DUPLICATE_TURN_ORDER",
        "Turn order must be unique within an auction call"
      );
    }

    if (
      auctionSessionTeamIds.has(
        team.auctionSessionTeamId
      )
    ) {
      throw new OpenAuctionCallDomainError(
        "DUPLICATE_AUCTION_SESSION_TEAM",
        "An auction session team can appear only once within an auction call"
      );
    }

    turnOrders.add(team.turnOrder);
    auctionSessionTeamIds.add(
      team.auctionSessionTeamId
    );
  }

  const orderedTeams = [...teams].sort(
    (left, right) =>
      left.turnOrder - right.turnOrder
  );

  const callerIndex = orderedTeams.findIndex(
    (team) =>
      team.auctionSessionTeamId ===
      auctionCall.callerAuctionSessionTeamId
  );

  if (callerIndex === -1) {
    throw new OpenAuctionCallDomainError(
      "CALLER_NOT_FOUND",
      "Caller must belong to the auction call"
    );
  }

  const caller = orderedTeams[callerIndex];

  if (caller === undefined) {
    throw new OpenAuctionCallDomainError(
      "CALLER_NOT_FOUND",
      "Caller must belong to the auction call"
    );
  }

  if (caller.status !== "ACTIVE") {
    throw new OpenAuctionCallDomainError(
      "CALLER_NOT_ACTIVE",
      "Caller must be active when the auction call is opened"
    );
  }

  if (caller.maximumBid < openingBid) {
    throw new OpenAuctionCallDomainError(
      "CALLER_MAXIMUM_BID_TOO_LOW",
      "Caller maximum bid must cover the opening bid"
    );
  }

  const updatedTeams = orderedTeams.map((team) => {
    if (
      team.auctionSessionTeamId ===
      caller.auctionSessionTeamId
    ) {
      return team;
    }

    if (
      team.status === "ACTIVE" &&
      team.maximumBid <= openingBid
    ) {
      return {
        ...team,
        status: "EXCLUDED" as const,
        exclusionReason: "MAXIMUM_BID_TOO_LOW" as const
      };
    }

    return team;
  });

  const nextTurnTeam = findNextActiveTeam(
    updatedTeams,
    callerIndex
  );

  const openStatus = transitionAuctionCallStatus(
    auctionCall.status,
    "open"
  );

  if (nextTurnTeam === null) {
    return {
      auctionCall: {
        ...auctionCall,
        status: transitionAuctionCallStatus(
          openStatus,
          "provisionalAward"
        ),
        openingBid,
        currentBid: openingBid,
        currentLeaderAuctionSessionTeamId:
          caller.auctionSessionTeamId,
        currentTurnAuctionSessionTeamId: null,
        provisionalWinnerAuctionSessionTeamId:
          caller.auctionSessionTeamId
      },
      teams: updatedTeams
    };
  }

  return {
    auctionCall: {
      ...auctionCall,
      status: openStatus,
      openingBid,
      currentBid: openingBid,
      currentLeaderAuctionSessionTeamId:
        caller.auctionSessionTeamId,
      currentTurnAuctionSessionTeamId:
        nextTurnTeam.auctionSessionTeamId,
      provisionalWinnerAuctionSessionTeamId: null
    },
    teams: updatedTeams
  };
}

function findNextActiveTeam(
  teams: readonly AuctionCallTeam[],
  callerIndex: number
): AuctionCallTeam | null {
  for (let offset = 1; offset < teams.length; offset += 1) {
    const index =
      (callerIndex + offset) % teams.length;

    const team = teams[index];

    if (
      team !== undefined &&
      team.status === "ACTIVE"
    ) {
      return team;
    }
  }

  return null;
}
