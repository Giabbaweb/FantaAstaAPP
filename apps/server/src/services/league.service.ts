import type {
  CreateLeagueInput,
  League,
  UpdateLeagueInput
} from "@fantaastaapp/contracts";

import type {
  CreateLeaguePersistenceInput,
  LeagueRepository,
  UpdateLeaguePersistenceInput
} from "../repositories/league.repository.js";

export type LeagueServiceErrorCode =
  | "LEAGUE_NOT_FOUND"
  | "LEAGUE_NAME_ALREADY_EXISTS"
  | "LEAGUE_UPDATE_FAILED";

export class LeagueServiceError
  extends Error
{
  readonly code:
    LeagueServiceErrorCode;

  constructor(
    code: LeagueServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "LeagueServiceError";
    this.code = code;
  }
}

function cleanLeagueName(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeLeagueName(
  value: string
): string {
  return cleanLeagueName(value)
    .toLocaleLowerCase("it-IT");
}

export class LeagueService {
  constructor(
    private readonly repository:
      LeagueRepository
  ) {}

  async listLeagues():
    Promise<League[]> {
    return this.repository.findAll();
  }

  async getLeagueById(
    id: string
  ): Promise<League> {
    return this.requireLeague(id);
  }

  async createLeague(
    input: CreateLeagueInput
  ): Promise<League> {
    const normalizedName =
      normalizeLeagueName(
        input.name
      );

    await this.assertNameAvailable(
      normalizedName
    );

    const persistenceInput:
      CreateLeaguePersistenceInput = {
        name: cleanLeagueName(
          input.name
        ),
        normalizedName
      };

    return this.repository.create(
      persistenceInput
    );
  }

  async updateLeague(
    id: string,
    input: UpdateLeagueInput
  ): Promise<League> {
    await this.requireLeague(id);

    const persistenceInput:
      UpdateLeaguePersistenceInput = {};

    if (input.name !== undefined) {
      const normalizedName =
        normalizeLeagueName(
          input.name
        );

      await this.assertNameAvailable(
        normalizedName,
        id
      );

      persistenceInput.name =
        cleanLeagueName(
          input.name
        );

      persistenceInput.normalizedName =
        normalizedName;
    }

    const updatedLeague =
      await this.repository.update(
        id,
        persistenceInput
      );

    if (!updatedLeague) {
      throw new LeagueServiceError(
        "LEAGUE_UPDATE_FAILED",
        `Failed to update league "${id}"`
      );
    }

    return updatedLeague;
  }

  private async requireLeague(
    id: string
  ): Promise<League> {
    const league =
      await this.repository.findById(
        id
      );

    if (!league) {
      throw new LeagueServiceError(
        "LEAGUE_NOT_FOUND",
        `League "${id}" was not found`
      );
    }

    return league;
  }

  private async assertNameAvailable(
    normalizedName: string,
    currentLeagueId?: string
  ): Promise<void> {
    const existing =
      await this.repository
        .findByNormalizedName(
          normalizedName
        );

    if (
      existing &&
      existing.id !== currentLeagueId
    ) {
      throw new LeagueServiceError(
        "LEAGUE_NAME_ALREADY_EXISTS",
        `League name "${normalizedName}" already exists`
      );
    }
  }
}
