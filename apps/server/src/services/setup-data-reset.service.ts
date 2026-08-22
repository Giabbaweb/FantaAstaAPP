import { db } from "../db/client.js";

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

export type SetupDataResetServiceErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "INVALID_SESSION_STATUS"
  | "TEAM_CREDITS_RESET_FAILED";

export class SetupDataResetServiceError
  extends Error {
  readonly code:
    SetupDataResetServiceErrorCode;

  constructor(
    code: SetupDataResetServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "SetupDataResetServiceError";
    this.code = code;
  }
}

export type SetupDataResetResult = {
  deletedRosterEntries: number;
  deletedPlayers: number;
  resetTeams: number;
};

export class SetupDataResetService {
  constructor(
    private readonly auctionSessionRepository:
      Pick<
        AuctionSessionRepository,
        "findByIdWithExecutor"
      >,
    private readonly auctionSessionTeamRepository:
      Pick<
        AuctionSessionTeamTransactionalRepository,
        | "findByAuctionSessionIdWithExecutor"
        | "updateRemainingCreditsWithExecutor"
      >,
    private readonly rosterEntryRepository:
      Pick<
        RosterEntryRepository,
        "deleteByAuctionSessionIdWithExecutor"
      >,
    private readonly playerRepository:
      Pick<
        PlayerRepository,
        "deleteByAuctionSessionIdWithExecutor"
      >
  ) {}

  execute(
    auctionSessionId: string
  ): SetupDataResetResult {
    return db.transaction((tx) => {
      const session =
        this.auctionSessionRepository
          .findByIdWithExecutor(
            tx,
            auctionSessionId
          );

      if (!session) {
        throw new SetupDataResetServiceError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (session.status !== "SETUP") {
        throw new SetupDataResetServiceError(
          "INVALID_SESSION_STATUS",
          "Setup data can only be reset while the auction session is in SETUP"
        );
      }

      /*
       * roster_entries must be removed before
       * players because player_id uses
       * ON DELETE RESTRICT.
       */
      const deletedRosterEntries =
        this.rosterEntryRepository
          .deleteByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );

      const deletedPlayers =
        this.playerRepository
          .deleteByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );

      const sessionTeams =
        this.auctionSessionTeamRepository
          .findByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );

      for (const sessionTeam of sessionTeams) {
        const updated =
          this.auctionSessionTeamRepository
            .updateRemainingCreditsWithExecutor(
              tx,
              sessionTeam.id,
              session.initialCredits
            );

        if (!updated) {
          throw new SetupDataResetServiceError(
            "TEAM_CREDITS_RESET_FAILED",
            `Failed to reset credits for auction session team "${sessionTeam.id}"`
          );
        }
      }

      return {
        deletedRosterEntries,
        deletedPlayers,
        resetTeams:
          sessionTeams.length
      };
    });
  }
}
