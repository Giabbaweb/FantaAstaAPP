import {
  db
} from "../db/client.js";
import {
  buildFmsRosterFilename
} from "../export/fms-roster-filename.js";
import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import type {
  AuctionSessionTeamTransactionalRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  TeamRepository
} from "../repositories/team.repository.js";
import type {
  FmsRosterExportService
} from "./fms-roster-export.service.js";

export type FmsSessionRosterExportFile = {
  auctionSessionTeamId: string;
  teamId: string;
  tableOrder: number;
  filename: string;
  content: string;
};

export type FmsSessionRosterExportServiceErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "TEAM_NOT_FOUND";

export class FmsSessionRosterExportServiceError
  extends Error
{
  readonly code:
    FmsSessionRosterExportServiceErrorCode;

  constructor(
    code: FmsSessionRosterExportServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "FmsSessionRosterExportServiceError";
    this.code = code;
  }
}

type FmsRosterExportPort = Pick<
  FmsRosterExportService,
  "executeFile"
>;

type TeamLookupPort = Pick<
  TeamRepository,
  "findById"
>;

export class FmsSessionRosterExportService {
  constructor(
    private readonly auctionSessionRepository:
      Pick<
        AuctionSessionRepository,
        "findByIdWithExecutor"
      >,
    private readonly auctionSessionTeamRepository:
      Pick<
        AuctionSessionTeamTransactionalRepository,
        "findByAuctionSessionIdWithExecutor"
      >,
    private readonly rosterExportService:
      FmsRosterExportPort,
    private readonly teamRepository:
      TeamLookupPort
  ) {}

  async execute(
    auctionSessionId: string
  ): Promise<FmsSessionRosterExportFile[]> {
    const sessionTeams =
      db.transaction((tx) => {
        const auctionSession =
          this.auctionSessionRepository
            .findByIdWithExecutor(
              tx,
              auctionSessionId
            );

        if (!auctionSession) {
          throw new FmsSessionRosterExportServiceError(
            "AUCTION_SESSION_NOT_FOUND",
            `Auction session "${auctionSessionId}" was not found`
          );
        }

        return this.auctionSessionTeamRepository
          .findByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );
      });

    const files:
      FmsSessionRosterExportFile[] = [];

    for (const sessionTeam of sessionTeams) {
      const {
        content,
        teamId
      } =
        this.rosterExportService.executeFile(
          sessionTeam.id
        );

      const team =
        await this.teamRepository.findById(
          teamId
        );

      if (!team) {
        throw new FmsSessionRosterExportServiceError(
          "TEAM_NOT_FOUND",
          `Team "${teamId}" was not found`
        );
      }

      files.push({
        auctionSessionTeamId:
          sessionTeam.id,
        teamId,
        tableOrder:
          sessionTeam.tableOrder,
        filename:
          buildFmsRosterFilename(
            team.name
          ),
        content
      });
    }

    return files;
  }
}
