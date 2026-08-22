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

export type InitialRosterResetServiceErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "INVALID_SESSION_STATUS"
  | "PLAYER_RESET_FAILED"
  | "TEAM_CREDITS_RESET_FAILED";

export class InitialRosterResetServiceError
  extends Error {
  readonly code:
    InitialRosterResetServiceErrorCode;

  constructor(
    code: InitialRosterResetServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "InitialRosterResetServiceError";
    this.code = code;
  }
}

export type InitialRosterResetResult = {
  deletedRosterEntries: number;
  resetPlayers: number;
  resetTeams: number;
};

export class InitialRosterResetService {
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
        | "findByAuctionSessionTeamIdWithExecutor"
        | "deleteByAuctionSessionIdWithExecutor"
      >,
    private readonly playerRepository:
      Pick<
        PlayerRepository,
        "updateAvailabilityStatusWithExecutor"
      >
  ) {}

  execute(
    auctionSessionId: string
  ): InitialRosterResetResult {
    return db.transaction((tx) => {
      const session =
        this.auctionSessionRepository
          .findByIdWithExecutor(
            tx,
            auctionSessionId
          );

      if (!session) {
        throw new InitialRosterResetServiceError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (session.status !== "SETUP") {
        throw new InitialRosterResetServiceError(
          "INVALID_SESSION_STATUS",
          "Initial rosters can only be reset while the auction session is in SETUP"
        );
      }

      const sessionTeams =
        this.auctionSessionTeamRepository
          .findByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );

      const rosterEntries =
        sessionTeams.flatMap(
          (sessionTeam) =>
            this.rosterEntryRepository
              .findByAuctionSessionTeamIdWithExecutor(
                tx,
                sessionTeam.id
              )
        );

      const rosteredPlayerIds = [
        ...new Set(
          rosterEntries.map(
            (entry) => entry.playerId
          )
        )
      ];

      /*
       * Delete roster entries before resetting
       * player availability. The player archive
       * itself is deliberately preserved.
       */
      const deletedRosterEntries =
        this.rosterEntryRepository
          .deleteByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );

      let resetPlayers = 0;

      for (
        const playerId of rosteredPlayerIds
      ) {
        const updated =
          this.playerRepository
            .updateAvailabilityStatusWithExecutor(
              tx,
              playerId,
              "AVAILABLE"
            );

        if (!updated) {
          throw new InitialRosterResetServiceError(
            "PLAYER_RESET_FAILED",
            `Failed to reset player "${playerId}" to AVAILABLE`
          );
        }

        resetPlayers += 1;
      }

      for (const sessionTeam of sessionTeams) {
        const updated =
          this.auctionSessionTeamRepository
            .updateRemainingCreditsWithExecutor(
              tx,
              sessionTeam.id,
              session.initialCredits
            );

        if (!updated) {
          throw new InitialRosterResetServiceError(
            "TEAM_CREDITS_RESET_FAILED",
            `Failed to reset credits for auction session team "${sessionTeam.id}"`
          );
        }
      }

      return {
        deletedRosterEntries,
        resetPlayers,
        resetTeams:
          sessionTeams.length
      };
    });
  }
}
