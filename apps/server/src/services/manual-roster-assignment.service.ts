import {
  assertManualRosterAssignmentAllowed
} from "@fantaastaapp/domain";
import type {
  ContractYear,
  RosterEntry
} from "@fantaastaapp/domain";

import {
  db
} from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import type {
  AuctionSessionTeamTransactionalRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  PlayerRepository
} from "../repositories/player.repository.js";
import type {
  RosterEntryRepository
} from "../repositories/roster-entry.repository.js";

export type ManualRosterAssignmentInput = {
  auctionSessionId: string;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: ContractYear;
};

export type ManualRosterAssignmentServiceErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "AUCTION_SESSION_TEAM_NOT_FOUND"
  | "TEAM_SESSION_MISMATCH"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_SESSION_MISMATCH"
  | "PLAYER_NOT_AVAILABLE"
  | "PLAYER_ALREADY_ROSTERED"
  | "ROSTER_PLAYER_NOT_FOUND"
  | "TEAM_UPDATE_FAILED"
  | "PLAYER_UPDATE_FAILED";

export class ManualRosterAssignmentServiceError
  extends Error
{
  readonly code:
    ManualRosterAssignmentServiceErrorCode;

  constructor(
    code: ManualRosterAssignmentServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "ManualRosterAssignmentServiceError";
    this.code = code;
  }
}

export class ManualRosterAssignmentService {
  constructor(
    private readonly auctionSessionRepository:
      Pick<
        AuctionSessionRepository,
        "findByIdWithExecutor"
      >,
    private readonly auctionSessionTeamRepository:
      AuctionSessionTeamTransactionalRepository,
    private readonly rosterEntryRepository:
      RosterEntryRepository,
    private readonly playerRepository:
      Pick<
        PlayerRepository,
        | "findByIdWithExecutor"
        | "findByIdsWithExecutor"
        | "updateAvailabilityStatusWithExecutor"
      >
  ) {}

  execute(
    input: ManualRosterAssignmentInput
  ): RosterEntry {
    return db.transaction((tx) =>
      this.executeWithExecutor(
        tx,
        input
      )
    );
  }

  executeWithExecutor(
    executor: DatabaseWriteExecutor,
    input: ManualRosterAssignmentInput
  ): RosterEntry {
    const auctionSession =
      this.auctionSessionRepository
        .findByIdWithExecutor(
          executor,
          input.auctionSessionId
        );

    if (!auctionSession) {
      throw new ManualRosterAssignmentServiceError(
        "AUCTION_SESSION_NOT_FOUND",
        `Auction session "${input.auctionSessionId}" was not found`
      );
    }

    const auctionSessionTeam =
      this.auctionSessionTeamRepository
        .findByIdWithExecutor(
          executor,
          input.auctionSessionTeamId
        );

    if (!auctionSessionTeam) {
      throw new ManualRosterAssignmentServiceError(
        "AUCTION_SESSION_TEAM_NOT_FOUND",
        `Auction session team "${input.auctionSessionTeamId}" was not found`
      );
    }

    if (
      auctionSessionTeam.auctionSessionId !==
      auctionSession.id
    ) {
      throw new ManualRosterAssignmentServiceError(
        "TEAM_SESSION_MISMATCH",
        "Auction session team does not belong to the auction session"
      );
    }

    const player =
      this.playerRepository
        .findByIdWithExecutor(
          executor,
          input.playerId
        );

    if (!player) {
      throw new ManualRosterAssignmentServiceError(
        "PLAYER_NOT_FOUND",
        `Player "${input.playerId}" was not found`
      );
    }

    if (
      player.auctionSessionId !==
      auctionSession.id
    ) {
      throw new ManualRosterAssignmentServiceError(
        "PLAYER_SESSION_MISMATCH",
        "Player does not belong to the auction session"
      );
    }

    if (
      player.availabilityStatus !==
      "AVAILABLE"
    ) {
      throw new ManualRosterAssignmentServiceError(
        "PLAYER_NOT_AVAILABLE",
        `Player "${player.id}" is not available`
      );
    }

    const existingRosterEntry =
      this.rosterEntryRepository
        .findByPlayerIdWithExecutor(
          executor,
          player.id
        );

    if (existingRosterEntry) {
      throw new ManualRosterAssignmentServiceError(
        "PLAYER_ALREADY_ROSTERED",
        `Player "${player.id}" already belongs to a roster`
      );
    }

    const roster =
      this.rosterEntryRepository
        .findByAuctionSessionTeamIdWithExecutor(
          executor,
          auctionSessionTeam.id
        );

    const rosterPlayers =
      this.playerRepository
        .findByIdsWithExecutor(
          executor,
          roster.map(
            (entry) => entry.playerId
          )
        );

    if (
      rosterPlayers.length !==
      roster.length
    ) {
      throw new ManualRosterAssignmentServiceError(
        "ROSTER_PLAYER_NOT_FOUND",
        "One or more roster players were not found"
      );
    }

    const currentRoleCount =
      rosterPlayers.filter(
        (rosterPlayer) =>
          rosterPlayer.role === player.role
      ).length;

    assertManualRosterAssignmentAllowed({
      auctionSessionStatus:
        auctionSession.status,
      playerRole:
        player.role,
      currentRosterSize:
        roster.length,
      currentRoleCount,
      remainingCredits:
        auctionSessionTeam.remainingCredits,
      acquisitionCost:
        input.acquisitionCost,
      contractYear:
        input.contractYear
    });

    const createdRosterEntry =
      this.rosterEntryRepository
        .createWithExecutor(
          executor,
          {
            auctionSessionTeamId:
              auctionSessionTeam.id,
            playerId:
              player.id,
            acquisitionCost:
              input.acquisitionCost,
            contractYear:
              input.contractYear,
            source:
              "MANUAL_ASSIGNMENT"
          }
        );

    const updatedTeam =
      this.auctionSessionTeamRepository
        .updateRemainingCreditsWithExecutor(
          executor,
          auctionSessionTeam.id,
          auctionSessionTeam.remainingCredits -
            input.acquisitionCost
        );

    if (!updatedTeam) {
      throw new ManualRosterAssignmentServiceError(
        "TEAM_UPDATE_FAILED",
        `Failed to update auction session team "${auctionSessionTeam.id}"`
      );
    }

    const updatedPlayer =
      this.playerRepository
        .updateAvailabilityStatusWithExecutor(
          executor,
          player.id,
          "ROSTERED"
        );

    if (!updatedPlayer) {
      throw new ManualRosterAssignmentServiceError(
        "PLAYER_UPDATE_FAILED",
        `Failed to update player "${player.id}"`
      );
    }

    return createdRosterEntry;
  }
}
