import type {
  AuctionSession
} from "@fantaastaapp/contracts";

import {
  db
} from "../db/client.js";
import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import type {
  AuctionEventRepository,
  CreateAuctionEventInput
} from "../repositories/auction-event.repository.js";
import type {
  AuctionSessionOperationalStateUpdate,
  AuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import type {
  CommandRegistryRepository,
  RegisteredAuctionSessionCommandType
} from "./command-registry.repository.js";

export type AtomicAuctionSessionCommandExecutorErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "STALE_STATE"
  | "COMMAND_ID_CONFLICT"
  | "AUCTION_SESSION_SAVE_FAILED";

export class AtomicAuctionSessionCommandExecutorError
  extends Error
{
  readonly code:
    AtomicAuctionSessionCommandExecutorErrorCode;

  constructor(
    code: AtomicAuctionSessionCommandExecutorErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AtomicAuctionSessionCommandExecutorError";
    this.code = code;
  }
}

export type ExecuteAtomicAuctionSessionCommandInput = {
  auctionSessionId: string;
  commandId: string;
  commandType:
    RegisteredAuctionSessionCommandType;
  expectedStateVersion: number;
  requestFingerprint: string;
  update: AuctionSessionOperationalStateUpdate;
  auditEvent:
    CreateAuctionEventInput;
  validate?: (
    session: AuctionSession
  ) => void;
};

export type ExecuteAtomicAuctionSessionCommandResult = {
  session: AuctionSession;
  stateVersion: number;
  idempotentReplay: boolean;
};

export class AtomicAuctionSessionCommandExecutor {
  constructor(
    private readonly auctionSessionRepository:
      AuctionSessionRepository,
    private readonly stateRepository:
      AuctionSessionStateRepository,
    private readonly commandRegistryRepository:
      CommandRegistryRepository,
    private readonly auctionEventRepository:
      AuctionEventRepository
  ) {}

  async execute(
    input: ExecuteAtomicAuctionSessionCommandInput
  ): Promise<ExecuteAtomicAuctionSessionCommandResult> {
    return db.transaction((tx) => {
      const existingCommand =
        this.commandRegistryRepository
          .findByCommandIdWithExecutor(
            tx,
            input.auctionSessionId,
            input.commandId
          );

      if (existingCommand) {
        if (
          existingCommand.commandScope !==
            "AUCTION_SESSION"
        ) {
          throw new AtomicAuctionSessionCommandExecutorError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with a different command scope`
          );
        }

        if (
          existingCommand.commandType !==
            "SUSPEND_SESSION" &&
          existingCommand.commandType !==
            "RESUME_SESSION"
        ) {
          throw new AtomicAuctionSessionCommandExecutorError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with a different session command type`
          );
        }

        this.assertMatchingCommand(
          existingCommand,
          input
        );

        return {
          session:
            existingCommand.result,
          stateVersion:
            existingCommand.resultStateVersion,
          idempotentReplay: true
        };
      }

      const currentStateVersion =
        this.stateRepository
          .getCurrentStateVersionWithExecutor(
            tx,
            input.auctionSessionId
          );

      if (currentStateVersion === null) {
        throw new AtomicAuctionSessionCommandExecutorError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${input.auctionSessionId}" was not found`
        );
      }

      if (
        currentStateVersion !==
          input.expectedStateVersion
      ) {
        throw new AtomicAuctionSessionCommandExecutorError(
          "STALE_STATE",
          `Auction session "${input.auctionSessionId}" expected state version ${input.expectedStateVersion}, but current version is ${currentStateVersion}`
        );
      }

      const currentSession =
        this.auctionSessionRepository
          .findByIdWithExecutor(
            tx,
            input.auctionSessionId
          );

      if (!currentSession) {
        throw new AtomicAuctionSessionCommandExecutorError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${input.auctionSessionId}" was not found`
        );
      }

      input.validate?.(
        currentSession
      );

      const updatedState =
        this.stateRepository
          .updateOperationalStateIfMatchesWithExecutor(
            tx,
            input.auctionSessionId,
            input.expectedStateVersion,
            input.update
          );

      if (!updatedState) {
        throw new AtomicAuctionSessionCommandExecutorError(
          "STALE_STATE",
          `Auction session "${input.auctionSessionId}" no longer matches state version ${input.expectedStateVersion}`
        );
      }

      const persistedSession =
        this.auctionSessionRepository
          .findByIdWithExecutor(
            tx,
            input.auctionSessionId
          );

      if (!persistedSession) {
        throw new AtomicAuctionSessionCommandExecutorError(
          "AUCTION_SESSION_SAVE_FAILED",
          `Failed to load updated auction session "${input.auctionSessionId}"`
        );
      }

      this.auctionEventRepository
        .createWithExecutor(
          tx,
          input.auditEvent
        );

      const registeredCommand =
        this.commandRegistryRepository
          .createSessionCommandWithExecutor(
            tx,
            {
              auctionSessionId:
                input.auctionSessionId,
              commandId:
                input.commandId,
              commandType:
                input.commandType,
              expectedStateVersion:
                input.expectedStateVersion,
              resultStateVersion:
                updatedState.stateVersion,
              requestFingerprint:
                input.requestFingerprint,
              result:
                persistedSession
            }
          );

      return {
        session:
          registeredCommand.result,
        stateVersion:
          registeredCommand.resultStateVersion,
        idempotentReplay: false
      };
    });
  }

  private assertMatchingCommand(
    existingCommand: {
      commandType:
        RegisteredAuctionSessionCommandType;
      expectedStateVersion: number;
      requestFingerprint: string;
    },
    input: ExecuteAtomicAuctionSessionCommandInput
  ): void {
    const matches =
      existingCommand.commandType ===
        input.commandType &&
      existingCommand.expectedStateVersion ===
        input.expectedStateVersion &&
      existingCommand.requestFingerprint ===
        input.requestFingerprint;

    if (!matches) {
      throw new AtomicAuctionSessionCommandExecutorError(
        "COMMAND_ID_CONFLICT",
        `Command ID "${input.commandId}" was already used with different command data`
      );
    }
  }
}
