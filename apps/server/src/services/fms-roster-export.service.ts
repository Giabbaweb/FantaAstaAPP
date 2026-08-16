import type {
  AuctionSessionStatus
} from "@fantaastaapp/contracts";

import {
  db
} from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
  buildFmsRevoRosterProjection
} from "../export/fms-revo-roster.projection.js";
import {
  serializeFmsRevoRoster
} from "../export/fms-revo-roster.serializer.js";
import type {
  FmsRevoRosterExportEntry
} from "../export/fms-revo-roster.serializer.js";
import {
  assertFmsRevoRosterExportable
} from "../export/fms-revo-roster.validator.js";
import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import type {
  AuctionSessionTeamTransactionalRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  FmsExportGoalkeeperRepository
} from "../repositories/fms-export-goalkeeper.repository.js";
import type {
  PlayerRepository
} from "../repositories/player.repository.js";
import type {
  RosterEntryRepository
} from "../repositories/roster-entry.repository.js";

const exportableAuctionSessionStatuses:
  ReadonlySet<AuctionSessionStatus> =
    new Set([
      "COMPLETED",
      "CLOSED"
    ]);

export type FmsRosterExportServiceErrorCode =
  | "AUCTION_SESSION_TEAM_NOT_FOUND"
  | "AUCTION_SESSION_NOT_FOUND"
  | "AUCTION_SESSION_NOT_EXPORTABLE"
  | "PLAYER_SESSION_MISMATCH"
  | "FMS_EXPORT_GOALKEEPER_NOT_SELECTED"
  | "FMS_EXPORT_GOALKEEPER_PLAYER_NOT_FOUND";

export class FmsRosterExportServiceError
  extends Error
{
  readonly code:
    FmsRosterExportServiceErrorCode;

  constructor(
    code: FmsRosterExportServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "FmsRosterExportServiceError";
    this.code = code;
  }
}

export class FmsRosterExportService {
  constructor(
    private readonly auctionSessionRepository:
      Pick<
        AuctionSessionRepository,
        "findByIdWithExecutor"
      >,
    private readonly auctionSessionTeamRepository:
      AuctionSessionTeamTransactionalRepository,
    private readonly rosterEntryRepository:
      Pick<
        RosterEntryRepository,
        "findByAuctionSessionTeamIdWithExecutor"
      >,
    private readonly playerRepository:
      Pick<
        PlayerRepository,
        "findByIdWithExecutor" |
        "findByIdsWithExecutor"
      >,
    private readonly goalkeeperRepository:
      Pick<
        FmsExportGoalkeeperRepository,
        "findByAuctionSessionTeamIdWithExecutor"
      >
  ) {}

  execute(
    auctionSessionTeamId: string
  ): FmsRevoRosterExportEntry[] {
    return db.transaction((tx) =>
      this.executeWithExecutor(
        tx,
        auctionSessionTeamId
      )
    );
  }

  executeSerialized(
    auctionSessionTeamId: string
  ): string {
    return serializeFmsRevoRoster(
      this.execute(
        auctionSessionTeamId
      )
    );
  }

  executeFile(
    auctionSessionTeamId: string
  ): {
    content: string;
    teamId: string;
  } {
    return db.transaction((tx) => {
      const auctionSessionTeam =
        this.auctionSessionTeamRepository
          .findByIdWithExecutor(
            tx,
            auctionSessionTeamId
          );

      if (!auctionSessionTeam) {
        throw new FmsRosterExportServiceError(
          "AUCTION_SESSION_TEAM_NOT_FOUND",
          `Auction session team "${auctionSessionTeamId}" was not found`
        );
      }

      const entries =
        this.executeWithExecutor(
          tx,
          auctionSessionTeamId
        );

      return {
        content:
          serializeFmsRevoRoster(entries),
        teamId: auctionSessionTeam.teamId
      };
    });
  }

  executeWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionTeamId: string
  ): FmsRevoRosterExportEntry[] {
    const auctionSessionTeam =
      this.auctionSessionTeamRepository
        .findByIdWithExecutor(
          executor,
          auctionSessionTeamId
        );

    if (!auctionSessionTeam) {
      throw new FmsRosterExportServiceError(
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
      throw new FmsRosterExportServiceError(
        "AUCTION_SESSION_NOT_FOUND",
        `Auction session "${auctionSessionTeam.auctionSessionId}" was not found`
      );
    }

    if (
      !exportableAuctionSessionStatuses.has(
        auctionSession.status
      )
    ) {
      throw new FmsRosterExportServiceError(
        "AUCTION_SESSION_NOT_EXPORTABLE",
        `Auction session "${auctionSession.id}" cannot be exported from status "${auctionSession.status}"`
      );
    }

    const rosterEntries =
      this.rosterEntryRepository
        .findByAuctionSessionTeamIdWithExecutor(
          executor,
          auctionSessionTeam.id
        );

    const players =
      this.playerRepository
        .findByIdsWithExecutor(
          executor,
          rosterEntries.map(
            (entry) => entry.playerId
          )
        );

    for (const player of players) {
      if (
        player.auctionSessionId !==
        auctionSession.id
      ) {
        throw new FmsRosterExportServiceError(
          "PLAYER_SESSION_MISMATCH",
          `Player "${player.id}" does not belong to auction session "${auctionSession.id}"`
        );
      }
    }

    const projection =
      buildFmsRevoRosterProjection(
        rosterEntries,
        players
      );

    assertFmsRevoRosterExportable(
      projection
    );

    const goalkeeperSelection =
      this.goalkeeperRepository
        .findByAuctionSessionTeamIdWithExecutor(
          executor,
          auctionSessionTeam.id
        );

    if (!goalkeeperSelection) {
      throw new FmsRosterExportServiceError(
        "FMS_EXPORT_GOALKEEPER_NOT_SELECTED",
        `FMS export goalkeeper was not selected for auction session team "${auctionSessionTeam.id}"`
      );
    }

    const exportGoalkeeper =
      this.playerRepository
        .findByIdWithExecutor(
          executor,
          goalkeeperSelection.playerId
        );

    if (!exportGoalkeeper) {
      throw new FmsRosterExportServiceError(
        "FMS_EXPORT_GOALKEEPER_PLAYER_NOT_FOUND",
        `FMS export goalkeeper player "${goalkeeperSelection.playerId}" was not found`
      );
    }

    if (
      exportGoalkeeper.auctionSessionId !==
      auctionSession.id
    ) {
      throw new FmsRosterExportServiceError(
        "PLAYER_SESSION_MISMATCH",
        `Player "${exportGoalkeeper.id}" does not belong to auction session "${auctionSession.id}"`
      );
    }

    return [
      ...projection,
      {
        role: "P",
        name: exportGoalkeeper.name,
        acquisitionCost: 0,
        contractYear: 1
      }
    ];
  }
}
