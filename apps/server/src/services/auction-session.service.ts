import type {
  AuctionSession,
  CreateAuctionSessionInput,
  UpdateAuctionSessionInput
} from "@fantaastaapp/contracts";
import {
  assertAuctionSessionDeletionAllowed,
  assertAuctionSessionUpdateAllowed,
  isOperationalAuctionSessionStatus,
  transitionAuctionSessionStatus
} from "@fantaastaapp/domain";
import type {
  AuctionSessionCommand
} from "@fantaastaapp/domain";

import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";

export type AuctionSessionServiceErrorCode =
  | "SESSION_NOT_FOUND"
  | "ACTIVE_SESSION_ALREADY_EXISTS"
  | "SESSION_UPDATE_FAILED"
  | "SESSION_STATUS_UPDATE_FAILED"
  | "SESSION_DELETE_FAILED";

export class AuctionSessionServiceError extends Error {
  readonly code: AuctionSessionServiceErrorCode;

  constructor(
    code: AuctionSessionServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name = "AuctionSessionServiceError";
    this.code = code;
  }
}

export class AuctionSessionService {
  constructor(
    private readonly repository: AuctionSessionRepository
  ) {}

  async listSessions(): Promise<AuctionSession[]> {
    return this.repository.findAll();
  }

  async getSessionById(id: string): Promise<AuctionSession> {
    return this.requireSession(id);
  }

  async getActiveSession(): Promise<AuctionSession | null> {
    return this.repository.findActive();
  }

  async createSession(
    input: CreateAuctionSessionInput
  ): Promise<AuctionSession> {
    return this.repository.create(input);
  }

  async updateSession(
    id: string,
    input: UpdateAuctionSessionInput
  ): Promise<AuctionSession> {
    const session = await this.requireSession(id);

    assertAuctionSessionUpdateAllowed(
      session,
      input
    );

    const updatedSession = await this.repository.update(
      id,
      input
    );

    if (!updatedSession) {
      throw new AuctionSessionServiceError(
        "SESSION_UPDATE_FAILED",
        `Failed to update auction session "${id}"`
      );
    }

    return updatedSession;
  }

  async deleteSession(id: string): Promise<void> {
    const session = await this.requireSession(id);

    assertAuctionSessionDeletionAllowed(session);

    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new AuctionSessionServiceError(
        "SESSION_DELETE_FAILED",
        `Failed to delete auction session "${id}"`
      );
    }
  }

  async executeCommand(
    id: string,
    command: AuctionSessionCommand
  ): Promise<AuctionSession> {
    const session = await this.requireSession(id);

    const nextStatus = transitionAuctionSessionStatus(
      session.status,
      command
    );

    if (
      isOperationalAuctionSessionStatus(nextStatus)
    ) {
      await this.assertNoOtherActiveSession(id);
    }

    const updatedSession =
      await this.repository.updateStatus(
        id,
        nextStatus
      );

    if (!updatedSession) {
      throw new AuctionSessionServiceError(
        "SESSION_STATUS_UPDATE_FAILED",
        `Failed to update status for auction session "${id}"`
      );
    }

    return updatedSession;
  }

  private async requireSession(
    id: string
  ): Promise<AuctionSession> {
    const session = await this.repository.findById(id);

    if (!session) {
      throw new AuctionSessionServiceError(
        "SESSION_NOT_FOUND",
        `Auction session "${id}" was not found`
      );
    }

    return session;
  }

  private async assertNoOtherActiveSession(
    sessionId: string
  ): Promise<void> {
    const activeSession =
      await this.repository.findActive();

    if (
      activeSession &&
      activeSession.id !== sessionId
    ) {
      throw new AuctionSessionServiceError(
        "ACTIVE_SESSION_ALREADY_EXISTS",
        `Auction session "${activeSession.id}" is already active`
      );
    }
  }
}
