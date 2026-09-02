import {
  assertRosterAssignmentRemovalAllowed
} from "@fantaastaapp/domain";
import type {
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

export type RosterAssignmentRemovalInput = {
  auctionSessionId: string;
  rosterEntryId: string;
};

export type RosterAssignmentRemovalSnapshot = {
  rosterEntry: RosterEntry;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
};

export type RosterAssignmentRemovalResult = {
  removed: RosterAssignmentRemovalSnapshot;
  remainingCreditsAfterRemoval: number;
};

export type RosterAssignmentRemovalServiceErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "ROSTER_ENTRY_NOT_FOUND"
  | "TEAM_NOT_FOUND"
  | "TEAM_SESSION_MISMATCH"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_SESSION_MISMATCH"
  | "TEAM_UPDATE_FAILED"
  | "ROSTER_ENTRY_DELETE_FAILED"
  | "PLAYER_UPDATE_FAILED";

export class RosterAssignmentRemovalServiceError
  extends Error
{
  readonly code:
    RosterAssignmentRemovalServiceErrorCode;

  constructor(
    code: RosterAssignmentRemovalServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "RosterAssignmentRemovalServiceError";
    this.code = code;
  }
}

export class RosterAssignmentRemovalService {
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
        | "updateAvailabilityStatusWithExecutor"
      >
  ) {}

  execute(
    input: RosterAssignmentRemovalInput
  ): RosterAssignmentRemovalResult {
    return db.transaction((tx) =>
      this.executeWithExecutor(
        tx,
        input
      )
    );
  }

  executeWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RosterAssignmentRemovalInput
  ): RosterAssignmentRemovalResult {
    const auctionSession =
      this.auctionSessionRepository
        .findByIdWithExecutor(
          executor,
          input.auctionSessionId
        );

    if (!auctionSession) {
      throw new RosterAssignmentRemovalServiceError(
        "AUCTION_SESSION_NOT_FOUND",
        `Auction session "${input.auctionSessionId}" was not found`
      );
    }

    assertRosterAssignmentRemovalAllowed({
      auctionSessionStatus:
        auctionSession.status
    });

    const rosterEntry =
      this.rosterEntryRepository
        .findByIdWithExecutor(
          executor,
          input.rosterEntryId
        );

    if (!rosterEntry) {
      throw new RosterAssignmentRemovalServiceError(
        "ROSTER_ENTRY_NOT_FOUND",
        `Roster entry "${input.rosterEntryId}" was not found`
      );
    }

    const team =
      this.auctionSessionTeamRepository
        .findByIdWithExecutor(
          executor,
          rosterEntry.auctionSessionTeamId
        );

    if (!team) {
      throw new RosterAssignmentRemovalServiceError(
        "TEAM_NOT_FOUND",
        `Auction session team "${rosterEntry.auctionSessionTeamId}" was not found`
      );
    }

    this.assertTeamBelongsToSession(
      team,
      auctionSession.id
    );

    const player =
      this.playerRepository
        .findByIdWithExecutor(
          executor,
          rosterEntry.playerId
        );

    if (!player) {
      throw new RosterAssignmentRemovalServiceError(
        "PLAYER_NOT_FOUND",
        `Player "${rosterEntry.playerId}" was not found`
      );
    }

    this.assertPlayerBelongsToSession(
      player,
      auctionSession.id
    );

    const remainingCreditsAfterRemoval =
      team.remainingCredits +
      rosterEntry.acquisitionCost;

    const updatedTeam =
      this.auctionSessionTeamRepository
        .updateRemainingCreditsWithExecutor(
          executor,
          team.id,
          remainingCreditsAfterRemoval
        );

    if (!updatedTeam) {
      throw new RosterAssignmentRemovalServiceError(
        "TEAM_UPDATE_FAILED",
        `Failed to update auction session team "${team.id}"`
      );
    }

    const deleted =
      this.rosterEntryRepository
        .deleteByIdWithExecutor(
          executor,
          rosterEntry.id
        );

    if (!deleted) {
      throw new RosterAssignmentRemovalServiceError(
        "ROSTER_ENTRY_DELETE_FAILED",
        `Failed to delete roster entry "${rosterEntry.id}"`
      );
    }

    const updatedPlayer =
      this.playerRepository
        .updateAvailabilityStatusWithExecutor(
          executor,
          player.id,
          "AVAILABLE"
        );

    if (!updatedPlayer) {
      throw new RosterAssignmentRemovalServiceError(
        "PLAYER_UPDATE_FAILED",
        `Failed to update player "${player.id}"`
      );
    }

    return {
      removed: {
        rosterEntry,
        auctionSessionTeamId:
          rosterEntry.auctionSessionTeamId,
        playerId:
          rosterEntry.playerId,
        acquisitionCost:
          rosterEntry.acquisitionCost
      },
      remainingCreditsAfterRemoval
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
      throw new RosterAssignmentRemovalServiceError(
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
      throw new RosterAssignmentRemovalServiceError(
        "PLAYER_SESSION_MISMATCH",
        "Player does not belong to the auction session"
      );
    }
  }
}
