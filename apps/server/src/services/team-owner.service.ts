import type {
  CreateTeamOwnerInput,
  TeamOwner,
  UpdateTeamOwnerInput
} from "@fantaastaapp/contracts";

import type {
  TeamOwnerRepository
} from "../repositories/team-owner.repository.js";

export type TeamOwnerServiceErrorCode =
  | "TEAM_OWNER_NOT_FOUND"
  | "TEAM_OWNER_ALREADY_EXISTS"
  | "TEAM_OWNER_UPDATE_FAILED"
  | "TEAM_OWNER_DELETE_FAILED";

export class TeamOwnerServiceError extends Error {
  readonly code: TeamOwnerServiceErrorCode;

  constructor(
    code: TeamOwnerServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "TeamOwnerServiceError";
    this.code = code;
  }
}

export class TeamOwnerService {
  constructor(
    private readonly repository:
      TeamOwnerRepository
  ) {}

  async listTeamOwners(
    teamId: string
  ): Promise<TeamOwner[]> {
    return this.repository.findByTeamId(
      teamId
    );
  }

  async getTeamOwner(
    teamId: string,
    ownerId: string
  ): Promise<TeamOwner> {
    return this.requireTeamOwner(
      teamId,
      ownerId
    );
  }

  async createTeamOwner(
    teamId: string,
    input: CreateTeamOwnerInput
  ): Promise<TeamOwner> {
    const existing =
      await this.repository
        .findByTeamAndOwner(
          teamId,
          input.ownerId
        );

    if (existing) {
      throw new TeamOwnerServiceError(
        "TEAM_OWNER_ALREADY_EXISTS",
        `Owner "${input.ownerId}" is already associated with team "${teamId}"`
      );
    }

    if (input.isPrimary) {
      await this.demoteExistingPrimary(
        teamId
      );
    }

    return this.repository.create(
      teamId,
      input
    );
  }

  async updateTeamOwner(
    teamId: string,
    ownerId: string,
    input: UpdateTeamOwnerInput
  ): Promise<TeamOwner> {
    await this.requireTeamOwner(
      teamId,
      ownerId
    );

    if (input.isPrimary) {
      await this.demoteExistingPrimary(
        teamId,
        ownerId
      );
    }

    const updated =
      await this.repository.update(
        teamId,
        ownerId,
        input
      );

    if (!updated) {
      throw new TeamOwnerServiceError(
        "TEAM_OWNER_UPDATE_FAILED",
        `Failed to update owner "${ownerId}" for team "${teamId}"`
      );
    }

    return updated;
  }

  async deleteTeamOwner(
    teamId: string,
    ownerId: string
  ): Promise<void> {
    await this.requireTeamOwner(
      teamId,
      ownerId
    );

    const deleted =
      await this.repository.delete(
        teamId,
        ownerId
      );

    if (!deleted) {
      throw new TeamOwnerServiceError(
        "TEAM_OWNER_DELETE_FAILED",
        `Failed to delete owner "${ownerId}" from team "${teamId}"`
      );
    }
  }

  private async requireTeamOwner(
    teamId: string,
    ownerId: string
  ): Promise<TeamOwner> {
    const teamOwner =
      await this.repository
        .findByTeamAndOwner(
          teamId,
          ownerId
        );

    if (!teamOwner) {
      throw new TeamOwnerServiceError(
        "TEAM_OWNER_NOT_FOUND",
        `Owner "${ownerId}" is not associated with team "${teamId}"`
      );
    }

    return teamOwner;
  }

  private async demoteExistingPrimary(
    teamId: string,
    exceptOwnerId?: string
  ): Promise<void> {
    const teamOwners =
      await this.repository.findByTeamId(
        teamId
      );

    for (const teamOwner of teamOwners) {
      if (
        !teamOwner.isPrimary ||
        teamOwner.ownerId ===
          exceptOwnerId
      ) {
        continue;
      }

      const updated =
        await this.repository.update(
          teamId,
          teamOwner.ownerId,
          {
            isPrimary: false
          }
        );

      if (!updated) {
        throw new TeamOwnerServiceError(
          "TEAM_OWNER_UPDATE_FAILED",
          `Failed to demote primary owner "${teamOwner.ownerId}" for team "${teamId}"`
        );
      }
    }
  }
}
