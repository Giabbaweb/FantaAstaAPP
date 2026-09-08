import type {
  AuctionSessionStatus,
  Player
} from "@fantaastaapp/contracts";

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
  FmsExportGoalkeeperPersistenceRecord,
  FmsExportGoalkeeperRepository
} from "../repositories/fms-export-goalkeeper.repository.js";
import type {
  PlayerRepository
} from "../repositories/player.repository.js";
import type {
  RosterEntryRepository
} from "../repositories/roster-entry.repository.js";
import type {
  FmsSessionExportStateService
} from "./fms-session-export-state.service.js";

const selectableAuctionSessionStatuses:
  ReadonlySet<AuctionSessionStatus> =
    new Set([
      "COMPLETED"
    ]);

export type FmsExportGoalkeeperSelectionServiceErrorCode =
  | "AUCTION_SESSION_TEAM_NOT_FOUND"
  | "AUCTION_SESSION_NOT_FOUND"
  | "AUCTION_SESSION_NOT_SELECTABLE"
  | "PLAYER_NOT_FOUND"
  | "PLAYER_SESSION_MISMATCH"
  | "PLAYER_NOT_GOALKEEPER"
  | "PLAYER_ALREADY_ROSTERED"
  | "PLAYER_ALREADY_SELECTED"
  | "ROSTER_GOALKEEPERS_INVALID"
  | "INVALID_GOALKEEPER_REAL_TEAM";

export class FmsExportGoalkeeperSelectionServiceError
  extends Error
{
  readonly code:
    FmsExportGoalkeeperSelectionServiceErrorCode;

  constructor(
    code: FmsExportGoalkeeperSelectionServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "FmsExportGoalkeeperSelectionServiceError";
    this.code = code;
  }
}

export class FmsExportGoalkeeperSelectionService {
  constructor(
    private readonly auctionSessionRepository:
      Pick<
        AuctionSessionRepository,
        "findByIdWithExecutor"
      >,
    private readonly auctionSessionTeamRepository:
      AuctionSessionTeamTransactionalRepository,
    private readonly playerRepository:
      Pick<
        PlayerRepository,
        "findByIdWithExecutor" |
        "findByIdsWithExecutor"
      >,
    private readonly rosterEntryRepository:
      Pick<
        RosterEntryRepository,
        "findByAuctionSessionTeamIdWithExecutor" |
        "findByPlayerIdWithExecutor"
      >,
    private readonly goalkeeperRepository:
      FmsExportGoalkeeperRepository,
    private readonly fmsSessionExportStateService?:
      Pick<
        FmsSessionExportStateService,
        "invalidateWithExecutor"
      >
  ) {}

  getSelected(
    auctionSessionTeamId: string
  ): FmsExportGoalkeeperPersistenceRecord | null {
    return db.transaction((tx) => {
      const auctionSessionTeam =
        this.auctionSessionTeamRepository
          .findByIdWithExecutor(
            tx,
            auctionSessionTeamId
          );

      if (!auctionSessionTeam) {
        throw new FmsExportGoalkeeperSelectionServiceError(
          "AUCTION_SESSION_TEAM_NOT_FOUND",
          `Auction session team "${auctionSessionTeamId}" was not found`
        );
      }

      return this.goalkeeperRepository
        .findByAuctionSessionTeamIdWithExecutor(
          tx,
          auctionSessionTeamId
        );
    });
  }

  select(
    auctionSessionTeamId: string,
    playerId: string
  ): FmsExportGoalkeeperPersistenceRecord {
    return db.transaction((tx) =>
      this.selectWithExecutor(
        tx,
        auctionSessionTeamId,
        playerId
      )
    );
  }

  selectWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionTeamId: string,
    playerId: string
  ): FmsExportGoalkeeperPersistenceRecord {
    const auctionSessionTeam =
      this.auctionSessionTeamRepository
        .findByIdWithExecutor(
          executor,
          auctionSessionTeamId
        );

    if (!auctionSessionTeam) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "AUCTION_SESSION_TEAM_NOT_FOUND",
        `Auction session team "${auctionSessionTeamId}" was not found`
      );
    }

    const auctionSession =
      this.auctionSessionRepository
        .findByIdWithExecutor(
          executor,
          auctionSessionTeam.auctionSessionId
        );

    if (!auctionSession) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "AUCTION_SESSION_NOT_FOUND",
        `Auction session "${auctionSessionTeam.auctionSessionId}" was not found`
      );
    }

    if (
      !selectableAuctionSessionStatuses.has(
        auctionSession.status
      )
    ) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "AUCTION_SESSION_NOT_SELECTABLE",
        `FMS export goalkeeper cannot be selected from auction session status "${auctionSession.status}"`
      );
    }

    const candidate =
      this.playerRepository
        .findByIdWithExecutor(
          executor,
          playerId
        );

    if (!candidate) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "PLAYER_NOT_FOUND",
        `Player "${playerId}" was not found`
      );
    }

    if (
      candidate.auctionSessionId !==
      auctionSession.id
    ) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "PLAYER_SESSION_MISMATCH",
        `Player "${candidate.id}" does not belong to auction session "${auctionSession.id}"`
      );
    }

    if (candidate.role !== "P") {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "PLAYER_NOT_GOALKEEPER",
        `Player "${candidate.id}" is not a goalkeeper`
      );
    }

    const rosteredEntry =
      this.rosterEntryRepository
        .findByPlayerIdWithExecutor(
          executor,
          candidate.id
        );

    if (rosteredEntry) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "PLAYER_ALREADY_ROSTERED",
        `Player "${candidate.id}" already belongs to a roster`
      );
    }

    const existingPlayerSelection =
      this.goalkeeperRepository
        .findByPlayerIdWithExecutor(
          executor,
          candidate.id
        );

    const existingTeamSelection =
      this.goalkeeperRepository
        .findByAuctionSessionTeamIdWithExecutor(
          executor,
          auctionSessionTeam.id
        );

    if (
      existingPlayerSelection &&
      existingPlayerSelection.auctionSessionTeamId !==
        auctionSessionTeam.id
    ) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "PLAYER_ALREADY_SELECTED",
        `Player "${candidate.id}" is already selected as FMS export goalkeeper`
      );
    }

    const rosterEntries =
      this.rosterEntryRepository
        .findByAuctionSessionTeamIdWithExecutor(
          executor,
          auctionSessionTeam.id
        );

    const rosterPlayers =
      this.playerRepository
        .findByIdsWithExecutor(
          executor,
          rosterEntries.map(
            (entry) => entry.playerId
          )
        );

    const rosterGoalkeepers =
      rosterPlayers.filter(
        (player) => player.role === "P"
      );

    this.assertRosterGoalkeepersValid(
      rosterGoalkeepers
    );

    this.assertCandidateRealTeamAllowed(
      candidate,
      rosterGoalkeepers
    );

    if (existingTeamSelection) {
      if (
        existingTeamSelection.playerId ===
        candidate.id
      ) {
        return existingTeamSelection;
      }

      const updated =
        this.goalkeeperRepository
          .updateWithExecutor(
            executor,
            existingTeamSelection.id,
            {
              playerId: candidate.id
            }
          );

      if (!updated) {
        throw new Error(
          "Failed to update FMS export goalkeeper selection"
        );
      }

      this.fmsSessionExportStateService
        ?.invalidateWithExecutor(
          executor,
          auctionSession.id
        );

      return updated;
    }

    const created =
      this.goalkeeperRepository
        .createWithExecutor(
          executor,
          {
            auctionSessionTeamId:
              auctionSessionTeam.id,
            playerId: candidate.id
          }
        );

    this.fmsSessionExportStateService
      ?.invalidateWithExecutor(
        executor,
        auctionSession.id
      );

    return created;
  }

  private assertRosterGoalkeepersValid(
    goalkeepers: Player[]
  ): void {
    if (
      goalkeepers.length !== 2 ||
      goalkeepers.some(
        (player) =>
          !player.realTeamName?.trim()
      )
    ) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "ROSTER_GOALKEEPERS_INVALID",
        "Roster must contain exactly two goalkeepers with a real team"
      );
    }
  }

  private assertCandidateRealTeamAllowed(
    candidate: Player,
    rosterGoalkeepers: Player[]
  ): void {
    const candidateRealTeam =
      candidate.realTeamName?.trim();

    if (!candidateRealTeam) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "INVALID_GOALKEEPER_REAL_TEAM",
        `Player "${candidate.id}" does not have a real team`
      );
    }

    const allowedRealTeams =
      new Set(
        rosterGoalkeepers.map(
          (player) =>
            player.realTeamName!.trim()
        )
      );

    if (
      !allowedRealTeams.has(
        candidateRealTeam
      )
    ) {
      throw new FmsExportGoalkeeperSelectionServiceError(
        "INVALID_GOALKEEPER_REAL_TEAM",
        `Player "${candidate.id}" does not belong to an allowed real team`
      );
    }
  }
}
