import {
  assertTechnicalRosterCorrectionAllowed
} from "@fantaastaapp/domain";
import type {
  ContractYear,
  Player,
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
  AuctionSessionTeamPersistenceRecord,
  AuctionSessionTeamTransactionalRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  PlayerRepository
} from "../repositories/player.repository.js";
import type {
  RosterEntryRepository
} from "../repositories/roster-entry.repository.js";

export type TechnicalRosterCorrectionInput = {
  auctionSessionId: string;
  rosterEntryId: string;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: ContractYear;
};

export type TechnicalRosterCorrectionSnapshot = {
  rosterEntry: RosterEntry;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: ContractYear;
};

export type TechnicalRosterCorrectionResult = {
  before: TechnicalRosterCorrectionSnapshot;
  after: TechnicalRosterCorrectionSnapshot;
};

export type TechnicalRosterCorrectionServiceErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "ROSTER_ENTRY_NOT_FOUND"
  | "SOURCE_TEAM_NOT_FOUND"
  | "TARGET_TEAM_NOT_FOUND"
  | "TEAM_SESSION_MISMATCH"
  | "SOURCE_PLAYER_NOT_FOUND"
  | "TARGET_PLAYER_NOT_FOUND"
  | "PLAYER_SESSION_MISMATCH"
  | "TARGET_PLAYER_NOT_AVAILABLE"
  | "TARGET_PLAYER_ALREADY_ROSTERED"
  | "ROSTER_PLAYER_NOT_FOUND"
  | "ROSTER_ENTRY_UPDATE_FAILED"
  | "SOURCE_TEAM_UPDATE_FAILED"
  | "TARGET_TEAM_UPDATE_FAILED"
  | "SOURCE_PLAYER_UPDATE_FAILED"
  | "TARGET_PLAYER_UPDATE_FAILED";

export class TechnicalRosterCorrectionServiceError
  extends Error
{
  readonly code:
    TechnicalRosterCorrectionServiceErrorCode;

  constructor(
    code: TechnicalRosterCorrectionServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "TechnicalRosterCorrectionServiceError";
    this.code = code;
  }
}

export class TechnicalRosterCorrectionService {
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
    input: TechnicalRosterCorrectionInput
  ): TechnicalRosterCorrectionResult {
    return db.transaction((tx) =>
      this.executeWithExecutor(
        tx,
        input
      )
    );
  }

  executeWithExecutor(
    executor: DatabaseWriteExecutor,
    input: TechnicalRosterCorrectionInput
  ): TechnicalRosterCorrectionResult {
    const auctionSession =
      this.auctionSessionRepository
        .findByIdWithExecutor(
          executor,
          input.auctionSessionId
        );

    if (!auctionSession) {
      throw new TechnicalRosterCorrectionServiceError(
        "AUCTION_SESSION_NOT_FOUND",
        `Auction session "${input.auctionSessionId}" was not found`
      );
    }

    const existingRosterEntry =
      this.rosterEntryRepository
        .findByIdWithExecutor(
          executor,
          input.rosterEntryId
        );

    if (!existingRosterEntry) {
      throw new TechnicalRosterCorrectionServiceError(
        "ROSTER_ENTRY_NOT_FOUND",
        `Roster entry "${input.rosterEntryId}" was not found`
      );
    }

    const sourceTeam =
      this.auctionSessionTeamRepository
        .findByIdWithExecutor(
          executor,
          existingRosterEntry.auctionSessionTeamId
        );

    if (!sourceTeam) {
      throw new TechnicalRosterCorrectionServiceError(
        "SOURCE_TEAM_NOT_FOUND",
        `Source auction session team "${existingRosterEntry.auctionSessionTeamId}" was not found`
      );
    }

    const targetTeam =
      this.auctionSessionTeamRepository
        .findByIdWithExecutor(
          executor,
          input.auctionSessionTeamId
        );

    if (!targetTeam) {
      throw new TechnicalRosterCorrectionServiceError(
        "TARGET_TEAM_NOT_FOUND",
        `Target auction session team "${input.auctionSessionTeamId}" was not found`
      );
    }

    this.assertTeamBelongsToSession(
      sourceTeam,
      auctionSession.id
    );

    this.assertTeamBelongsToSession(
      targetTeam,
      auctionSession.id
    );

    const sourcePlayer =
      this.playerRepository
        .findByIdWithExecutor(
          executor,
          existingRosterEntry.playerId
        );

    if (!sourcePlayer) {
      throw new TechnicalRosterCorrectionServiceError(
        "SOURCE_PLAYER_NOT_FOUND",
        `Source player "${existingRosterEntry.playerId}" was not found`
      );
    }

    const targetPlayer =
      this.playerRepository
        .findByIdWithExecutor(
          executor,
          input.playerId
        );

    if (!targetPlayer) {
      throw new TechnicalRosterCorrectionServiceError(
        "TARGET_PLAYER_NOT_FOUND",
        `Target player "${input.playerId}" was not found`
      );
    }

    this.assertPlayerBelongsToSession(
      sourcePlayer,
      auctionSession.id
    );

    this.assertPlayerBelongsToSession(
      targetPlayer,
      auctionSession.id
    );

    const changesPlayer =
      sourcePlayer.id !==
      targetPlayer.id;

    if (
      changesPlayer &&
      targetPlayer.availabilityStatus !==
        "AVAILABLE"
    ) {
      throw new TechnicalRosterCorrectionServiceError(
        "TARGET_PLAYER_NOT_AVAILABLE",
        `Target player "${targetPlayer.id}" is not available`
      );
    }

    if (changesPlayer) {
      const targetPlayerRosterEntry =
        this.rosterEntryRepository
          .findByPlayerIdWithExecutor(
            executor,
            targetPlayer.id
          );

      if (targetPlayerRosterEntry) {
        throw new TechnicalRosterCorrectionServiceError(
          "TARGET_PLAYER_ALREADY_ROSTERED",
          `Target player "${targetPlayer.id}" already belongs to a roster`
        );
      }
    }

    const targetRoster =
      this.rosterEntryRepository
        .findByAuctionSessionTeamIdWithExecutor(
          executor,
          targetTeam.id
        );

    const targetRosterWithoutCorrectedEntry =
      targetRoster.filter(
        (entry) =>
          entry.id !==
          existingRosterEntry.id
      );

    const targetRosterPlayers =
      this.playerRepository
        .findByIdsWithExecutor(
          executor,
          targetRosterWithoutCorrectedEntry.map(
            (entry) => entry.playerId
          )
        );

    if (
      targetRosterPlayers.length !==
      targetRosterWithoutCorrectedEntry.length
    ) {
      throw new TechnicalRosterCorrectionServiceError(
        "ROSTER_PLAYER_NOT_FOUND",
        "One or more target roster players were not found"
      );
    }

    const targetRoleCount =
      targetRosterPlayers.filter(
        (player) =>
          player.role === targetPlayer.role
      ).length;

    const sameTeam =
      sourceTeam.id ===
      targetTeam.id;

    const availableCreditsBeforeCorrectedAcquisition =
      sameTeam
        ? targetTeam.remainingCredits +
          existingRosterEntry.acquisitionCost
        : targetTeam.remainingCredits;

    assertTechnicalRosterCorrectionAllowed({
      auctionSessionStatus:
        auctionSession.status,
      playerRole:
        targetPlayer.role,
      targetRosterSizeBeforeCorrectedEntry:
        targetRosterWithoutCorrectedEntry.length,
      targetRoleCountBeforeCorrectedEntry:
        targetRoleCount,
      availableCreditsBeforeCorrectedAcquisition,
      acquisitionCost:
        input.acquisitionCost,
      contractYear:
        input.contractYear
    });

    const sourceTeamFinalCredits =
      sameTeam
        ? availableCreditsBeforeCorrectedAcquisition -
          input.acquisitionCost
        : sourceTeam.remainingCredits +
          existingRosterEntry.acquisitionCost;

    const targetTeamFinalCredits =
      sameTeam
        ? sourceTeamFinalCredits
        : targetTeam.remainingCredits -
          input.acquisitionCost;

    const updatedRosterEntry =
      this.rosterEntryRepository
        .updateWithExecutor(
          executor,
          existingRosterEntry.id,
          {
            auctionSessionTeamId:
              targetTeam.id,
            playerId:
              targetPlayer.id,
            acquisitionCost:
              input.acquisitionCost,
            contractYear:
              input.contractYear,
            source:
              "TECHNICAL_CORRECTION"
          }
        );

    if (!updatedRosterEntry) {
      throw new TechnicalRosterCorrectionServiceError(
        "ROSTER_ENTRY_UPDATE_FAILED",
        `Failed to update roster entry "${existingRosterEntry.id}"`
      );
    }

    const updatedSourceTeam =
      this.auctionSessionTeamRepository
        .updateRemainingCreditsWithExecutor(
          executor,
          sourceTeam.id,
          sourceTeamFinalCredits
        );

    if (!updatedSourceTeam) {
      throw new TechnicalRosterCorrectionServiceError(
        "SOURCE_TEAM_UPDATE_FAILED",
        `Failed to update source auction session team "${sourceTeam.id}"`
      );
    }

    if (!sameTeam) {
      const updatedTargetTeam =
        this.auctionSessionTeamRepository
          .updateRemainingCreditsWithExecutor(
            executor,
            targetTeam.id,
            targetTeamFinalCredits
          );

      if (!updatedTargetTeam) {
        throw new TechnicalRosterCorrectionServiceError(
          "TARGET_TEAM_UPDATE_FAILED",
          `Failed to update target auction session team "${targetTeam.id}"`
        );
      }
    }

    if (changesPlayer) {
      const updatedSourcePlayer =
        this.playerRepository
          .updateAvailabilityStatusWithExecutor(
            executor,
            sourcePlayer.id,
            "AVAILABLE"
          );

      if (!updatedSourcePlayer) {
        throw new TechnicalRosterCorrectionServiceError(
          "SOURCE_PLAYER_UPDATE_FAILED",
          `Failed to update source player "${sourcePlayer.id}"`
        );
      }

      const updatedTargetPlayer =
        this.playerRepository
          .updateAvailabilityStatusWithExecutor(
            executor,
            targetPlayer.id,
            "ROSTERED"
          );

      if (!updatedTargetPlayer) {
        throw new TechnicalRosterCorrectionServiceError(
          "TARGET_PLAYER_UPDATE_FAILED",
          `Failed to update target player "${targetPlayer.id}"`
        );
      }
    }

    return {
      before: {
        rosterEntry:
          existingRosterEntry,
        auctionSessionTeamId:
          existingRosterEntry
            .auctionSessionTeamId,
        playerId:
          existingRosterEntry.playerId,
        acquisitionCost:
          existingRosterEntry
            .acquisitionCost,
        contractYear:
          existingRosterEntry.contractYear
      },
      after: {
        rosterEntry:
          updatedRosterEntry,
        auctionSessionTeamId:
          updatedRosterEntry
            .auctionSessionTeamId,
        playerId:
          updatedRosterEntry.playerId,
        acquisitionCost:
          updatedRosterEntry
            .acquisitionCost,
        contractYear:
          updatedRosterEntry.contractYear
      }
    };
  }

  private assertTeamBelongsToSession(
    team:
      AuctionSessionTeamPersistenceRecord,
    auctionSessionId: string
  ): void {
    if (
      team.auctionSessionId !==
      auctionSessionId
    ) {
      throw new TechnicalRosterCorrectionServiceError(
        "TEAM_SESSION_MISMATCH",
        "Auction session team does not belong to the auction session"
      );
    }
  }

  private assertPlayerBelongsToSession(
    player: Player,
    auctionSessionId: string
  ): void {
    if (
      player.auctionSessionId !==
      auctionSessionId
    ) {
      throw new TechnicalRosterCorrectionServiceError(
        "PLAYER_SESSION_MISMATCH",
        "Player does not belong to the auction session"
      );
    }
  }
}
