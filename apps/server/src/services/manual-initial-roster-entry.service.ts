import {
  assertManualInitialRosterEntryAllowed
} from "@fantaastaapp/domain";
import type {
  ContractYear
} from "@fantaastaapp/domain";

import {
  db
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

export type ManualInitialRosterEntryInput = {
  auctionSessionId: string;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: ContractYear;
};

export type ManualInitialRosterEntryServiceErrorCode =
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

export class ManualInitialRosterEntryServiceError
  extends Error
{
  readonly code:
    ManualInitialRosterEntryServiceErrorCode;

  constructor(
    code: ManualInitialRosterEntryServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "ManualInitialRosterEntryServiceError";
    this.code = code;
  }
}

export class ManualInitialRosterEntryService {
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
    input: ManualInitialRosterEntryInput
  ): void {
    db.transaction((tx) => {
      const auctionSession =
        this.auctionSessionRepository
          .findByIdWithExecutor(
            tx,
            input.auctionSessionId
          );

      if (!auctionSession) {
        throw new ManualInitialRosterEntryServiceError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${input.auctionSessionId}" was not found`
        );
      }

      const auctionSessionTeam =
        this.auctionSessionTeamRepository
          .findByIdWithExecutor(
            tx,
            input.auctionSessionTeamId
          );

      if (!auctionSessionTeam) {
        throw new ManualInitialRosterEntryServiceError(
          "AUCTION_SESSION_TEAM_NOT_FOUND",
          `Auction session team "${input.auctionSessionTeamId}" was not found`
        );
      }

      if (
        auctionSessionTeam.auctionSessionId !==
        auctionSession.id
      ) {
        throw new ManualInitialRosterEntryServiceError(
          "TEAM_SESSION_MISMATCH",
          "Auction session team does not belong to the auction session"
        );
      }

      const player =
        this.playerRepository
          .findByIdWithExecutor(
            tx,
            input.playerId
          );

      if (!player) {
        throw new ManualInitialRosterEntryServiceError(
          "PLAYER_NOT_FOUND",
          `Player "${input.playerId}" was not found`
        );
      }

      if (
        player.auctionSessionId !==
        auctionSession.id
      ) {
        throw new ManualInitialRosterEntryServiceError(
          "PLAYER_SESSION_MISMATCH",
          "Player does not belong to the auction session"
        );
      }

      if (
        player.availabilityStatus !==
        "AVAILABLE"
      ) {
        throw new ManualInitialRosterEntryServiceError(
          "PLAYER_NOT_AVAILABLE",
          `Player "${player.id}" is not available`
        );
      }

      const existingRosterEntry =
        this.rosterEntryRepository
          .findByPlayerIdWithExecutor(
            tx,
            player.id
          );

      if (existingRosterEntry) {
        throw new ManualInitialRosterEntryServiceError(
          "PLAYER_ALREADY_ROSTERED",
          `Player "${player.id}" already belongs to a roster`
        );
      }

      const roster =
        this.rosterEntryRepository
          .findByAuctionSessionTeamIdWithExecutor(
            tx,
            auctionSessionTeam.id
          );

      const rosterPlayers =
        this.playerRepository
          .findByIdsWithExecutor(
            tx,
            roster.map(
              (entry) => entry.playerId
            )
          );

      if (
        rosterPlayers.length !==
        roster.length
      ) {
        throw new ManualInitialRosterEntryServiceError(
          "ROSTER_PLAYER_NOT_FOUND",
          "One or more roster players were not found"
        );
      }

      const currentRoleCount =
        rosterPlayers.filter(
          (rosterPlayer) =>
            rosterPlayer.role === player.role
        ).length;

      const currentInitialRosterCount =
        roster.filter(
          (entry) =>
            entry.source === "INITIAL_ROSTER"
        ).length;

      assertManualInitialRosterEntryAllowed({
        auctionSessionStatus:
          auctionSession.status,
        currentInitialRosterCount,
        maximumInitialRosterEntries:
          auctionSession
            .maximumInitialRosterEntries,
        playerRole: player.role,
        currentRosterSize: roster.length,
        currentRoleCount,
        remainingCredits:
          auctionSessionTeam.remainingCredits,
        acquisitionCost:
          input.acquisitionCost,
        contractYear:
          input.contractYear
      });

      this.rosterEntryRepository
        .createWithExecutor(
          tx,
          {
            auctionSessionTeamId:
              auctionSessionTeam.id,
            playerId: player.id,
            acquisitionCost:
              input.acquisitionCost,
            contractYear:
              input.contractYear,
            source: "INITIAL_ROSTER"
          }
        );

      const updatedTeam =
        this.auctionSessionTeamRepository
          .updateRemainingCreditsWithExecutor(
            tx,
            auctionSessionTeam.id,
            auctionSessionTeam.remainingCredits -
              input.acquisitionCost
          );

      if (!updatedTeam) {
        throw new ManualInitialRosterEntryServiceError(
          "TEAM_UPDATE_FAILED",
          `Failed to update auction session team "${auctionSessionTeam.id}"`
        );
      }

      const updatedPlayer =
        this.playerRepository
          .updateAvailabilityStatusWithExecutor(
            tx,
            player.id,
            "ROSTERED"
          );

      if (!updatedPlayer) {
        throw new ManualInitialRosterEntryServiceError(
          "PLAYER_UPDATE_FAILED",
          `Failed to update player "${player.id}"`
        );
      }
    });
  }
}
