import type {
  CreateTeamInput,
  Team,
  UpdateTeamInput
} from "@fantaastaapp/contracts";

import type {
  TeamRepository
} from "../repositories/team.repository.js";

export type TeamServiceErrorCode =
  | "TEAM_NOT_FOUND"
  | "TEAM_UPDATE_FAILED"
  | "TEAM_DELETE_FAILED";

export class TeamServiceError extends Error {
  readonly code: TeamServiceErrorCode;

  constructor(
    code: TeamServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "TeamServiceError";
    this.code = code;
  }
}

export class TeamService {
  constructor(
    private readonly repository: TeamRepository
  ) {}

  async listTeams(): Promise<Team[]> {
    return this.repository.findAll();
  }

  async listTeamsByLeagueId(
    leagueId: string
  ): Promise<Team[]> {
    return this.repository.findByLeagueId(leagueId);
  }

  async getTeamById(id: string): Promise<Team> {
    return this.requireTeam(id);
  }

  async createTeam(
    input: CreateTeamInput
  ): Promise<Team> {
    return this.repository.create(input);
  }

  async updateTeam(
    id: string,
    input: UpdateTeamInput
  ): Promise<Team> {
    await this.requireTeam(id);

    const updatedTeam = await this.repository.update(
      id,
      input
    );

    if (!updatedTeam) {
      throw new TeamServiceError(
        "TEAM_UPDATE_FAILED",
        `Failed to update team "${id}"`
      );
    }

    return updatedTeam;
  }

  async deleteTeam(id: string): Promise<void> {
    await this.requireTeam(id);

    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new TeamServiceError(
        "TEAM_DELETE_FAILED",
        `Failed to delete team "${id}"`
      );
    }
  }

  private async requireTeam(id: string): Promise<Team> {
    const team = await this.repository.findById(id);

    if (!team) {
      throw new TeamServiceError(
        "TEAM_NOT_FOUND",
        `Team "${id}" was not found`
      );
    }

    return team;
  }
}
