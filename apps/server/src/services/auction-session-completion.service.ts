import type {
  Player,
  PlayerRole
} from "@fantaastaapp/contracts";
import {
  isRosterComplete
} from "@fantaastaapp/domain";

import type {
  AuctionCallReader
} from "../repositories/auction-call.repository.js";
import type {
  AuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  PlayerRepository
} from "../repositories/player.repository.js";
import type {
  RosterEntryRepository
} from "../repositories/roster-entry.repository.js";
import {
  db
} from "../db/client.js";

export type AuctionSessionCompletionErrorCode =
  | "OPERATIONAL_AUCTION_CALL_EXISTS"
  | "AUCTION_SESSION_ROSTERS_INCOMPLETE";

export class AuctionSessionCompletionError
  extends Error
{
  readonly code:
    AuctionSessionCompletionErrorCode;

  constructor(
    code: AuctionSessionCompletionErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AuctionSessionCompletionError";
    this.code = code;
  }
}

type AuctionSessionTeamReader = Pick<
  AuctionSessionTeamRepository,
  "findByAuctionSessionId"
>;

type RosterEntryReader = Pick<
  RosterEntryRepository,
  "findByAuctionSessionTeamIdWithExecutor"
>;

type PlayerReader = Pick<
  PlayerRepository,
  "findByIdsWithExecutor"
>;

export class AuctionSessionCompletionService {
  constructor(
    private readonly auctionSessionTeamRepository:
      AuctionSessionTeamReader,
    private readonly rosterEntryRepository:
      RosterEntryReader,
    private readonly playerRepository:
      PlayerReader,
    private readonly auctionCallRepository:
      Pick<
        AuctionCallReader,
        "findOperationalByAuctionSessionId"
      >
  ) {}

  async assertCanComplete(
    auctionSessionId: string
  ): Promise<void> {
    const operationalAuctionCall =
      await this.auctionCallRepository
        .findOperationalByAuctionSessionId(
          auctionSessionId
        );

    if (operationalAuctionCall) {
      throw new AuctionSessionCompletionError(
        "OPERATIONAL_AUCTION_CALL_EXISTS",
        `Auction session "${auctionSessionId}" has an operational auction call`
      );
    }

    await this.assertRostersComplete(
      auctionSessionId
    );
  }

  private async assertRostersComplete(
    auctionSessionId: string
  ): Promise<void> {
    const sessionTeams =
      await this.auctionSessionTeamRepository
        .findByAuctionSessionId(
          auctionSessionId
        );

    const allComplete =
      db.transaction((tx) =>
        sessionTeams.every(
          (sessionTeam) => {
            const rosterEntries =
              this.rosterEntryRepository
                .findByAuctionSessionTeamIdWithExecutor(
                  tx,
                  sessionTeam.id
                );

            const players =
              this.playerRepository
                .findByIdsWithExecutor(
                  tx,
                  rosterEntries.map(
                    (entry) => entry.playerId
                  )
                );

            if (
              players.length !==
              rosterEntries.length
            ) {
              return false;
            }

            const roleCounts:
              Record<PlayerRole, number> = {
                P: 0,
                D: 0,
                C: 0,
                A: 0
              };

            for (
              const player of
              players as Player[]
            ) {
              roleCounts[player.role] += 1;
            }

            return isRosterComplete(
              roleCounts
            );
          }
        )
      );

    if (!allComplete) {
      throw new AuctionSessionCompletionError(
        "AUCTION_SESSION_ROSTERS_INCOMPLETE",
        "All auction session rosters must be complete before completing the auction"
      );
    }
  }
}
