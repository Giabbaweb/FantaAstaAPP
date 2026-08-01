import {
  transitionAuctionCallStatus
} from "./auction-call.js";

import type { AuctionCall } from "./auction-call.js";
import type { AuctionCallTeam } from "./auction-call-team.js";

export type PassTurnInput = {
  auctionCall: AuctionCall;
  teams: readonly AuctionCallTeam[];
  auctionSessionTeamId: string;
};

export type PassTurnResult = {
  auctionCall: AuctionCall;
  teams: AuctionCallTeam[];
};

export type PassTurnDomainErrorCode =
  | "AUCTION_CALL_NOT_OPEN"
  | "CURRENT_TURN_NOT_SET"
  | "CURRENT_LEADER_NOT_SET"
  | "TEAM_NOT_FOUND"
  | "TEAM_NOT_ACTIVE"
  | "NOT_TEAM_TURN";

export class PassTurnDomainError extends Error {
  readonly code: PassTurnDomainErrorCode;

  constructor(
    code: PassTurnDomainErrorCode,
    message: string
  ) {
    super(message);

    this.name = "PassTurnDomainError";
    this.code = code;
  }
}

export function passTurn(
  input: PassTurnInput
): PassTurnResult {
  const {
    auctionCall,
    teams,
    auctionSessionTeamId
  } = input;

  if (auctionCall.status !== "OPEN") {
    throw new PassTurnDomainError(
      "AUCTION_CALL_NOT_OPEN",
      "Turn can be passed only on an open auction call"
    );
  }

  if (
    auctionCall.currentTurnAuctionSessionTeamId ===
    null
  ) {
    throw new PassTurnDomainError(
      "CURRENT_TURN_NOT_SET",
      "Open auction call must have a current turn team"
    );
  }

  if (
    auctionCall.currentLeaderAuctionSessionTeamId ===
    null
  ) {
    throw new PassTurnDomainError(
      "CURRENT_LEADER_NOT_SET",
      "Open auction call must have a current leader"
    );
  }

  const passingTeamIndex = teams.findIndex(
    (team) =>
      team.auctionSessionTeamId ===
      auctionSessionTeamId
  );

  if (passingTeamIndex === -1) {
    throw new PassTurnDomainError(
      "TEAM_NOT_FOUND",
      "Auction session team must belong to the auction call"
    );
  }

  const passingTeam = teams[passingTeamIndex];

  if (passingTeam === undefined) {
    throw new PassTurnDomainError(
      "TEAM_NOT_FOUND",
      "Auction session team must belong to the auction call"
    );
  }

  if (
    auctionCall.currentTurnAuctionSessionTeamId !==
    auctionSessionTeamId
  ) {
    throw new PassTurnDomainError(
      "NOT_TEAM_TURN",
      "Only the current turn team can pass"
    );
  }

  if (passingTeam.status !== "ACTIVE") {
    throw new PassTurnDomainError(
      "TEAM_NOT_ACTIVE",
      "Only an active team can pass"
    );
  }

  const updatedTeams = teams.map((team) => {
    if (
      team.auctionSessionTeamId ===
      auctionSessionTeamId
    ) {
      return {
        ...team,
        status: "PASSED" as const,
        exclusionReason: null
      };
    }

    return team;
  });

  const nextTurnTeam = findNextActiveTeam(
    updatedTeams,
    passingTeamIndex,
    auctionCall.currentLeaderAuctionSessionTeamId
  );

  if (nextTurnTeam === null) {
    return {
      auctionCall: {
        ...auctionCall,
        status: transitionAuctionCallStatus(
          auctionCall.status,
          "provisionalAward"
        ),
        currentTurnAuctionSessionTeamId: null,
        provisionalWinnerAuctionSessionTeamId:
          auctionCall.currentLeaderAuctionSessionTeamId
      },
      teams: updatedTeams
    };
  }

  return {
    auctionCall: {
      ...auctionCall,
      currentTurnAuctionSessionTeamId:
        nextTurnTeam.auctionSessionTeamId
    },
    teams: updatedTeams
  };
}

function findNextActiveTeam(
  teams: readonly AuctionCallTeam[],
  currentTeamIndex: number,
  currentLeaderAuctionSessionTeamId: string
): AuctionCallTeam | null {
  for (
    let offset = 1;
    offset < teams.length;
    offset += 1
  ) {
    const index =
      (currentTeamIndex + offset) % teams.length;

    const team = teams[index];

    if (
      team !== undefined &&
      team.status === "ACTIVE" &&
      team.auctionSessionTeamId !==
        currentLeaderAuctionSessionTeamId
    ) {
      return team;
    }
  }

  return null;
}
