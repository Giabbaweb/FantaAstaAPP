import type {
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

import {
  calculateMaximumBid,
  rosterRoleLimits,
  rosterSizeLimit
} from "@fantaastaapp/domain";

import type {
  AuctionCallReader
} from "../repositories/auction-call.repository.js";

import type {
  RealtimePublicDisplayReader,
  RealtimeSnapshotSessionReader,
  RealtimeSnapshotTeamReader
} from "./realtime-snapshot.repository.js";

export type RealtimeSnapshotServiceErrorCode =
  "REALTIME_SNAPSHOT_SESSION_NOT_FOUND";

export class RealtimeSnapshotServiceError
  extends Error
{
  readonly code:
    RealtimeSnapshotServiceErrorCode;

  constructor(
    code: RealtimeSnapshotServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "RealtimeSnapshotServiceError";

    this.code = code;
  }
}

export class RealtimeSnapshotService {
  constructor(
    private readonly sessionReader:
      RealtimeSnapshotSessionReader,
    private readonly sessionTeamReader:
      RealtimeSnapshotTeamReader,
    private readonly auctionCallReader:
      AuctionCallReader,
    private readonly publicDisplayReader:
      RealtimePublicDisplayReader,
    private readonly now:
      () => string = () =>
        new Date().toISOString()
  ) {}

  async buildSnapshot(
    auctionSessionId: string
  ): Promise<RealtimeAuctionSnapshot> {
    const sessionState =
      await this.sessionReader.findById(
        auctionSessionId
      );

    if (!sessionState) {
      throw new RealtimeSnapshotServiceError(
        "REALTIME_SNAPSHOT_SESSION_NOT_FOUND",
        `Auction session "${auctionSessionId}" was not found`
      );
    }

    const [
      sessionTeams,
      operationalAuctionCall,
      publicDisplayLeague,
      publicDisplayTeams
    ] = await Promise.all([
      this.sessionTeamReader
        .findByAuctionSessionId(
          auctionSessionId
        ),

      this.auctionCallReader
        .findOperationalByAuctionSessionId(
          auctionSessionId
        ),

this.publicDisplayReader
.findLeagueByAuctionSessionId(
auctionSessionId
),

      this.publicDisplayReader
        .findTeamsByAuctionSessionId(
          auctionSessionId
        )
    ]);

    const currentPlayer =
      operationalAuctionCall
        ? await this.publicDisplayReader
            .findPlayerById(
              operationalAuctionCall.call.playerId
            )
        : null;

if (!publicDisplayLeague) {
throw new RealtimeSnapshotServiceError(
"REALTIME_SNAPSHOT_SESSION_NOT_FOUND",
`League for auction session "${auctionSessionId}" was not found`
);
}

    const publicDisplay = {
league: publicDisplayLeague,
      teams: publicDisplayTeams.map((team) => {
        const rosterSize =
          team.roleCounts.P +
          team.roleCounts.D +
          team.roleCounts.C +
          team.roleCounts.A;

    const remainingRosterSlots =
      rosterSizeLimit - rosterSize;

    const maximumBid =
      remainingRosterSlots > 0
        ? calculateMaximumBid({
            remainingCredits:
              team.remainingCredits,
            remainingRosterSlots
          })
        : null;

        return {
          auctionSessionTeamId:
            team.auctionSessionTeamId,
          teamId: team.teamId,
          teamName: team.teamName,
          shortName: team.shortName,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
          logoPath: team.logoPath,
          tableOrder: team.tableOrder,
          remainingCredits:
            team.remainingCredits,
          maximumBid,
          roster: {
            P: {
              count: team.roleCounts.P,
              limit: rosterRoleLimits.P
            },
            D: {
              count: team.roleCounts.D,
              limit: rosterRoleLimits.D
            },
            C: {
              count: team.roleCounts.C,
              limit: rosterRoleLimits.C
            },
            A: {
              count: team.roleCounts.A,
              limit: rosterRoleLimits.A
            },
            rosterSize,
            rosterSizeLimit,
            remainingRosterSlots
          }
        };
      }),
      currentPlayer
    };

    return {
      stateVersion:
        sessionState.stateVersion,
      generatedAt: this.now(),
      session: sessionState.session,
      sessionTeams,
      operationalAuctionCall,
      publicDisplay
    };
  }
}
