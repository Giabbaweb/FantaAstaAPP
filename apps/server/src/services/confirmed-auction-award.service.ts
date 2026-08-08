import {
  assertConfirmedAuctionAwardAllowed
} from "@fantaastaapp/domain";

import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import type {
  AuctionSessionTeamTransactionalRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  PlayerRepository
} from "../repositories/player.repository.js";
import type {
  RosterEntryRepository
} from "../repositories/roster-entry.repository.js";

export type ConfirmedAuctionAwardServiceErrorCode =
  | "WINNER_NOT_FOUND"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_SESSION_MISMATCH"
  | "PLAYER_NOT_AVAILABLE"
  | "PLAYER_ALREADY_ROSTERED"
  | "ROSTER_PLAYER_NOT_FOUND"
  | "WINNER_UPDATE_FAILED"
  | "PLAYER_UPDATE_FAILED";

export class ConfirmedAuctionAwardServiceError
  extends Error
{
  readonly code:
    ConfirmedAuctionAwardServiceErrorCode;

  constructor(
    code: ConfirmedAuctionAwardServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "ConfirmedAuctionAwardServiceError";
    this.code = code;
  }
}

export class ConfirmedAuctionAwardService {
  constructor(
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

  apply(
    executor: DatabaseWriteExecutor,
    aggregate: AuctionCallAggregate
  ): void {
    const winnerId =
      aggregate.call
        .provisionalWinnerAuctionSessionTeamId;

    const acquisitionCost =
      aggregate.call.currentBid;

    if (
      !winnerId ||
      acquisitionCost === null
    ) {
      throw new ConfirmedAuctionAwardServiceError(
        "WINNER_NOT_FOUND",
        "Confirmed auction award requires a winner and final bid"
      );
    }

    const winner =
      this.auctionSessionTeamRepository
        .findByIdWithExecutor(
          executor,
          winnerId
        );

    if (!winner) {
      throw new ConfirmedAuctionAwardServiceError(
        "WINNER_NOT_FOUND",
        `Auction session team "${winnerId}" was not found`
      );
    }

    if (
      winner.auctionSessionId !==
      aggregate.call.auctionSessionId
    ) {
      throw new ConfirmedAuctionAwardServiceError(
        "WINNER_NOT_FOUND",
        "Winner does not belong to the auction session"
      );
    }

    const player =
      this.playerRepository
        .findByIdWithExecutor(
          executor,
          aggregate.call.playerId
        );

    if (!player) {
      throw new ConfirmedAuctionAwardServiceError(
        "PLAYER_NOT_FOUND",
        `Player "${aggregate.call.playerId}" was not found`
      );
    }

    if (
      player.auctionSessionId !==
      aggregate.call.auctionSessionId
    ) {
      throw new ConfirmedAuctionAwardServiceError(
        "PLAYER_SESSION_MISMATCH",
        "Player does not belong to the auction session"
      );
    }

    if (player.availabilityStatus !== "AVAILABLE") {
      throw new ConfirmedAuctionAwardServiceError(
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
      throw new ConfirmedAuctionAwardServiceError(
        "PLAYER_ALREADY_ROSTERED",
        `Player "${player.id}" already belongs to a roster`
      );
    }

    const roster =
      this.rosterEntryRepository
        .findByAuctionSessionTeamIdWithExecutor(
          executor,
          winner.id
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
      throw new ConfirmedAuctionAwardServiceError(
        "ROSTER_PLAYER_NOT_FOUND",
        "One or more roster players were not found"
      );
    }

    const currentRoleCount =
      rosterPlayers.filter(
        (rosterPlayer) =>
          rosterPlayer.role === player.role
      ).length;

    assertConfirmedAuctionAwardAllowed({
      playerRole: player.role,
      currentRosterSize: roster.length,
      currentRoleCount,
      remainingCredits:
        winner.remainingCredits,
      acquisitionCost
    });

    this.rosterEntryRepository
      .createWithExecutor(
        executor,
        {
          auctionSessionTeamId:
            winner.id,
          playerId: player.id,
          acquisitionCost,
          contractYear: 1,
          source: "AUCTION"
        }
      );

    const updatedWinner =
      this.auctionSessionTeamRepository
        .updateRemainingCreditsWithExecutor(
          executor,
          winner.id,
          winner.remainingCredits -
            acquisitionCost
        );

    if (!updatedWinner) {
      throw new ConfirmedAuctionAwardServiceError(
        "WINNER_UPDATE_FAILED",
        `Failed to update auction session team "${winner.id}"`
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
      throw new ConfirmedAuctionAwardServiceError(
        "PLAYER_UPDATE_FAILED",
        `Failed to update player "${player.id}"`
      );
    }
  }
}
