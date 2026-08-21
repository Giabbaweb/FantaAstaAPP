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
  | "AUCTION_SESSION_TEAM_DELETE_FAILED"
  | "AUCTION_SESSION_TEAM_REORDER_INVALID";

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

  async reorderSessionTeams(
    auctionSessionId: string,
    teamIds: string[]
  ): Promise<AuctionSessionTeam[]> {
    const current =
      await this.repository
        .findByAuctionSessionId(
          auctionSessionId
        );

    if (current.length === 0) {
      throw new AuctionSessionTeamServiceError(
        "AUCTION_SESSION_TEAM_REORDER_INVALID",
        `Auction session "${auctionSessionId}" has no participating teams`
      );
    }

    if (
      teamIds.length !== current.length
    ) {
      throw new AuctionSessionTeamServiceError(
        "AUCTION_SESSION_TEAM_REORDER_INVALID",
        `Table order must contain exactly ${current.length} teams`
      );
    }

    const requestedTeamIds =
      new Set(teamIds);

    if (
      requestedTeamIds.size !==
      teamIds.length
    ) {
      throw new AuctionSessionTeamServiceError(
        "AUCTION_SESSION_TEAM_REORDER_INVALID",
        "Table order contains duplicate teams"
      );
    }

    const currentTeamIds =
      new Set(
        current.map(
          (sessionTeam) =>
            sessionTeam.teamId
        )
      );

    const hasUnknownTeam =
      teamIds.some(
        (teamId) =>
          !currentTeamIds.has(teamId)
      );

    const hasMissingTeam =
      current.some(
        (sessionTeam) =>
          !requestedTeamIds.has(
            sessionTeam.teamId
          )
      );

    if (
      hasUnknownTeam ||
      hasMissingTeam
    ) {
      throw new AuctionSessionTeamServiceError(
        "AUCTION_SESSION_TEAM_REORDER_INVALID",
        "Table order must contain exactly the teams participating in the auction session"
      );
    }

    return this.repository.reorder(
      auctionSessionId,
      teamIds
    );
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
