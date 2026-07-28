import type {
  AuctionSessionTeam,
  CreateAuctionSessionTeamInput,
  UpdateAuctionSessionTeamInput
} from "@fantaastaapp/contracts";

import type {
  AuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";

export type AuctionSessionTeamServiceErrorCode =
  | "AUCTION_SESSION_TEAM_NOT_FOUND"
  | "AUCTION_SESSION_TEAM_UPDATE_FAILED"
  | "AUCTION_SESSION_TEAM_DELETE_FAILED";

export class AuctionSessionTeamServiceError
  extends Error
{
  readonly code: AuctionSessionTeamServiceErrorCode;

  constructor(
    code: AuctionSessionTeamServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "AuctionSessionTeamServiceError";
    this.code = code;
  }
}

export class AuctionSessionTeamService {
  constructor(
    private readonly repository:
      AuctionSessionTeamRepository
  ) {}

  async listSessionTeams(
    auctionSessionId: string
  ): Promise<AuctionSessionTeam[]> {
    return this.repository.findByAuctionSessionId(
      auctionSessionId
    );
  }

  async getSessionTeam(
    auctionSessionId: string,
    teamId: string
  ): Promise<AuctionSessionTeam> {
    return this.requireSessionTeam(
      auctionSessionId,
      teamId
    );
  }

  async createSessionTeam(
    auctionSessionId: string,
    input: CreateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam> {
    return this.repository.create(
      auctionSessionId,
      input
    );
  }

  async updateSessionTeam(
    auctionSessionId: string,
    teamId: string,
    input: UpdateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam> {
    await this.requireSessionTeam(
      auctionSessionId,
      teamId
    );

    const updatedSessionTeam =
      await this.repository.update(
        auctionSessionId,
        teamId,
        input
      );

    if (!updatedSessionTeam) {
      throw new AuctionSessionTeamServiceError(
        "AUCTION_SESSION_TEAM_UPDATE_FAILED",
        `Failed to update team "${teamId}" in auction session "${auctionSessionId}"`
      );
    }

    return updatedSessionTeam;
  }

  async deleteSessionTeam(
    auctionSessionId: string,
    teamId: string
  ): Promise<void> {
    await this.requireSessionTeam(
      auctionSessionId,
      teamId
    );

    const deleted = await this.repository.delete(
      auctionSessionId,
      teamId
    );

    if (!deleted) {
      throw new AuctionSessionTeamServiceError(
        "AUCTION_SESSION_TEAM_DELETE_FAILED",
        `Failed to delete team "${teamId}" from auction session "${auctionSessionId}"`
      );
    }
  }

  private async requireSessionTeam(
    auctionSessionId: string,
    teamId: string
  ): Promise<AuctionSessionTeam> {
    const sessionTeam = await this.repository.findOne(
      auctionSessionId,
      teamId
    );

    if (!sessionTeam) {
      throw new AuctionSessionTeamServiceError(
        "AUCTION_SESSION_TEAM_NOT_FOUND",
        `Team "${teamId}" was not found in auction session "${auctionSessionId}"`
      );
    }

    return sessionTeam;
  }
}
