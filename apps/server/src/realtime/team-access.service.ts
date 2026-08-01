import type {
  TeamAccessCredential,
  TeamAccessRepository
} from "./team-access.repository.js";
import {
  hashTeamAccessPin,
  verifyTeamAccessPin
} from "./team-access-pin.js";

export type TeamAccessServiceErrorCode =
  | "TEAM_ACCESS_NOT_FOUND"
  | "TEAM_ACCESS_PIN_NOT_CONFIGURED"
  | "TEAM_ACCESS_PIN_UPDATE_FAILED";

export class TeamAccessServiceError
  extends Error
{
  readonly code: TeamAccessServiceErrorCode;

  constructor(
    code: TeamAccessServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "TeamAccessServiceError";
    this.code = code;
  }
}

export class TeamAccessService {
  constructor(
    private readonly repository:
      TeamAccessRepository
  ) {}

  async setAccessPin(
    auctionSessionTeamId: string,
    pin: string
  ): Promise<void> {
    await this.requireCredential(
      auctionSessionTeamId
    );

    const accessPinHash =
      await hashTeamAccessPin(pin);

    const updated =
      await this.repository.updateAccessPinHash(
        auctionSessionTeamId,
        accessPinHash
      );

    if (!updated) {
      throw new TeamAccessServiceError(
        "TEAM_ACCESS_PIN_UPDATE_FAILED",
        `Failed to update access PIN for auction session team "${auctionSessionTeamId}"`
      );
    }
  }

  async verifyAccessPin(
    auctionSessionTeamId: string,
    pin: string
  ): Promise<boolean> {
    const credential =
      await this.requireCredential(
        auctionSessionTeamId
      );

    if (!credential.accessPinHash) {
      throw new TeamAccessServiceError(
        "TEAM_ACCESS_PIN_NOT_CONFIGURED",
        `Access PIN is not configured for auction session team "${auctionSessionTeamId}"`
      );
    }

    return verifyTeamAccessPin(
      pin,
      credential.accessPinHash
    );
  }

  private async requireCredential(
    auctionSessionTeamId: string
  ): Promise<TeamAccessCredential> {
    const credential =
      await this.repository
        .findByAuctionSessionTeamId(
          auctionSessionTeamId
        );

    if (!credential) {
      throw new TeamAccessServiceError(
        "TEAM_ACCESS_NOT_FOUND",
        `Auction session team "${auctionSessionTeamId}" was not found`
      );
    }

    return credential;
  }
}
