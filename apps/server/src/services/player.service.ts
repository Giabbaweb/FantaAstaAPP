import type {
  CreatePlayerInput,
  Player,
  UpdatePlayerInput
} from "@fantaastaapp/contracts";
import { normalizePlayerName } from "@fantaastaapp/domain";

import type {
  CreatePlayerPersistenceInput,
  PlayerRepository,
  UpdatePlayerPersistenceInput
} from "../repositories/player.repository.js";

export type PlayerServiceErrorCode =
  | "PLAYER_NOT_FOUND"
  | "PLAYER_FMS_CODE_ALREADY_EXISTS"
  | "PLAYER_NAME_ALREADY_EXISTS"
  | "PLAYER_UPDATE_FAILED"
  | "PLAYER_DELETE_FAILED";

export class PlayerServiceError extends Error {
  readonly code: PlayerServiceErrorCode;

  constructor(
    code: PlayerServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "PlayerServiceError";
    this.code = code;
  }
}

export class PlayerService {
  constructor(
    private readonly repository: PlayerRepository
  ) {}

  async listPlayersByAuctionSessionId(
    auctionSessionId: string
  ): Promise<Player[]> {
    return this.repository.findAllByAuctionSessionId(
      auctionSessionId
    );
  }

  async getPlayerById(id: string): Promise<Player> {
    return this.requirePlayer(id);
  }

  async createPlayer(
    input: CreatePlayerInput
  ): Promise<Player> {
    const normalizedName = normalizePlayerName(
      input.name
    );

    await this.assertFmsCodeAvailable(
      input.auctionSessionId,
      input.fmsCode
    );

    await this.assertNormalizedNameAvailable(
      input.auctionSessionId,
      normalizedName
    );

    const persistenceInput: CreatePlayerPersistenceInput = {
      auctionSessionId: input.auctionSessionId,
      fmsCode: input.fmsCode,
      name: input.name,
      normalizedName,
      role: input.role,
      availabilityStatus: input.availabilityStatus
    };

    return this.repository.create(persistenceInput);
  }

  async updatePlayer(
    id: string,
    input: UpdatePlayerInput
  ): Promise<Player> {
    const player = await this.requirePlayer(id);

    if (input.fmsCode !== undefined) {
      await this.assertFmsCodeAvailable(
        player.auctionSessionId,
        input.fmsCode,
        id
      );
    }

    const normalizedName =
      input.name === undefined
        ? undefined
        : normalizePlayerName(input.name);

    if (normalizedName !== undefined) {
      await this.assertNormalizedNameAvailable(
        player.auctionSessionId,
        normalizedName,
        id
      );
    }

    const persistenceInput: UpdatePlayerPersistenceInput = {};

    if (input.fmsCode !== undefined) {
      persistenceInput.fmsCode = input.fmsCode;
    }

    if (input.name !== undefined) {
      persistenceInput.name = input.name;
    }

    if (normalizedName !== undefined) {
      persistenceInput.normalizedName = normalizedName;
    }

    if (input.role !== undefined) {
      persistenceInput.role = input.role;
    }

    if (input.availabilityStatus !== undefined) {
      persistenceInput.availabilityStatus =
        input.availabilityStatus;
    }

    const updatedPlayer = await this.repository.update(
      id,
      persistenceInput
    );

    if (!updatedPlayer) {
      throw new PlayerServiceError(
        "PLAYER_UPDATE_FAILED",
        `Failed to update player "${id}"`
      );
    }

    return updatedPlayer;
  }

  async deletePlayer(id: string): Promise<void> {
    await this.requirePlayer(id);

    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new PlayerServiceError(
        "PLAYER_DELETE_FAILED",
        `Failed to delete player "${id}"`
      );
    }
  }

  private async requirePlayer(
    id: string
  ): Promise<Player> {
    const player = await this.repository.findById(id);

    if (!player) {
      throw new PlayerServiceError(
        "PLAYER_NOT_FOUND",
        `Player "${id}" was not found`
      );
    }

    return player;
  }

  private async assertFmsCodeAvailable(
    auctionSessionId: string,
    fmsCode: string,
    excludedPlayerId?: string
  ): Promise<void> {
    const existingPlayer =
      await this.repository.findByFmsCode(
        auctionSessionId,
        fmsCode
      );

    if (
      existingPlayer &&
      existingPlayer.id !== excludedPlayerId
    ) {
      throw new PlayerServiceError(
        "PLAYER_FMS_CODE_ALREADY_EXISTS",
        `Player FMS code "${fmsCode}" already exists in auction session "${auctionSessionId}"`
      );
    }
  }

  private async assertNormalizedNameAvailable(
    auctionSessionId: string,
    normalizedName: string,
    excludedPlayerId?: string
  ): Promise<void> {
    const existingPlayer =
      await this.repository.findByNormalizedName(
        auctionSessionId,
        normalizedName
      );

    if (
      existingPlayer &&
      existingPlayer.id !== excludedPlayerId
    ) {
      throw new PlayerServiceError(
        "PLAYER_NAME_ALREADY_EXISTS",
        `Player name "${normalizedName}" already exists in auction session "${auctionSessionId}"`
      );
    }
  }
}
