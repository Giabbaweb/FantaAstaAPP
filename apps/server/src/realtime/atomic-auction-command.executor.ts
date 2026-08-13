import {
  db
} from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import type {
  AuctionCallAggregate,
  AuctionCallRepository
} from "../repositories/auction-call.repository.js";
import type {
  AuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import type {
  CommandRegistryRepository,
  RegisteredAuctionCommandType
} from "./command-registry.repository.js";

export type AtomicAuctionCommandExecutorErrorCode =
  | "AUCTION_CALL_NOT_FOUND"
  | "AUCTION_SESSION_STATE_NOT_FOUND"
  | "AUCTION_SESSION_SUSPENDED"
  | "STALE_STATE"
  | "COMMAND_ID_CONFLICT"
  | "AUCTION_CALL_SAVE_FAILED";

export class AtomicAuctionCommandExecutorError
  extends Error
{
  readonly code:
    AtomicAuctionCommandExecutorErrorCode;

  constructor(
    code: AtomicAuctionCommandExecutorErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AtomicAuctionCommandExecutorError";
    this.code = code;
  }
}

export type ExecuteAtomicAuctionCommandInput = {
  auctionCallId: string;
  commandId: string;
  commandType: RegisteredAuctionCommandType;
  expectedStateVersion: number;
  requestFingerprint: string;
  apply: (
    aggregate: AuctionCallAggregate,
    executor: DatabaseWriteExecutor
  ) => AuctionCallAggregate;
};

export type ExecuteAtomicAuctionCommandResult = {
  aggregate: AuctionCallAggregate;
  stateVersion: number;
  idempotentReplay: boolean;
};

export class AtomicAuctionCommandExecutor {
  constructor(
    private readonly auctionCallRepository:
      AuctionCallRepository,
    private readonly stateRepository:
      AuctionSessionStateRepository,
    private readonly commandRegistryRepository:
      CommandRegistryRepository
  ) {}

  async execute(
    input: ExecuteAtomicAuctionCommandInput
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    return db.transaction((tx) => {
      const currentAggregate =
        this.auctionCallRepository
          .findByIdWithExecutor(
            tx,
            input.auctionCallId
          );

      if (!currentAggregate) {
        throw new AtomicAuctionCommandExecutorError(
          "AUCTION_CALL_NOT_FOUND",
          `Auction call "${input.auctionCallId}" was not found`
        );
      }

      const auctionSessionId =
        currentAggregate.call.auctionSessionId;

      const existingCommand =
        this.commandRegistryRepository
          .findByCommandIdWithExecutor(
            tx,
            auctionSessionId,
            input.commandId
          );

      if (existingCommand) {
        if (
          existingCommand.commandScope !==
            "AUCTION_CALL"
        ) {
          throw new AtomicAuctionCommandExecutorError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with a different command scope`
          );
        }

        this.assertMatchingCommand(
          existingCommand,
          input
        );

        return {
          aggregate:
            existingCommand.result,
          stateVersion:
            existingCommand.resultStateVersion,
          idempotentReplay: true
        };
      }

      const currentState =
        this.stateRepository
          .findByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );

      if (!currentState) {
        throw new AtomicAuctionCommandExecutorError(
          "AUCTION_SESSION_STATE_NOT_FOUND",
          `Auction session state "${auctionSessionId}" was not found`
        );
      }

      if (currentState.status === "SUSPENDED") {
        throw new AtomicAuctionCommandExecutorError(
          "AUCTION_SESSION_SUSPENDED",
          `Auction session "${auctionSessionId}" is suspended`
        );
      }

      if (
        currentState.stateVersion !==
          input.expectedStateVersion
      ) {
        throw new AtomicAuctionCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" expected state version ${input.expectedStateVersion}, but current version is ${currentState.stateVersion}`
        );
      }

      const updatedAggregate =
        input.apply(
          currentAggregate,
          tx
        );

      const savedAuctionCallId =
        this.auctionCallRepository
          .saveWithExecutor(
            tx,
            updatedAggregate
          );

      const persistedAggregate =
        this.auctionCallRepository
          .findByIdWithExecutor(
            tx,
            savedAuctionCallId
          );

      if (!persistedAggregate) {
        throw new AtomicAuctionCommandExecutorError(
          "AUCTION_CALL_SAVE_FAILED",
          `Failed to save auction call "${input.auctionCallId}"`
        );
      }

      const resultStateVersion =
        this.stateRepository
          .incrementStateVersionIfMatchesWithExecutor(
            tx,
            auctionSessionId,
            input.expectedStateVersion
          );

      if (resultStateVersion === null) {
        throw new AtomicAuctionCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" no longer matches state version ${input.expectedStateVersion}`
        );
      }

      const registeredCommand =
        this.commandRegistryRepository
          .createWithExecutor(
            tx,
            {
              auctionSessionId,
              auctionCallId:
                input.auctionCallId,
              commandId:
                input.commandId,
              commandType:
                input.commandType,
              expectedStateVersion:
                input.expectedStateVersion,
              resultStateVersion,
              requestFingerprint:
                input.requestFingerprint,
              result:
                persistedAggregate
            }
          );

      return {
        aggregate:
          registeredCommand.result,
        stateVersion:
          registeredCommand.resultStateVersion,
        idempotentReplay: false
      };
    });
  }

  private assertMatchingCommand(
    existingCommand: {
      auctionCallId: string;
      commandType: RegisteredAuctionCommandType;
      expectedStateVersion: number;
      requestFingerprint: string;
    },
    input: ExecuteAtomicAuctionCommandInput
  ): void {
    const matches =
      existingCommand.auctionCallId ===
        input.auctionCallId &&
      existingCommand.commandType ===
        input.commandType &&
      existingCommand.expectedStateVersion ===
        input.expectedStateVersion &&
      existingCommand.requestFingerprint ===
        input.requestFingerprint;

    if (!matches) {
      throw new AtomicAuctionCommandExecutorError(
        "COMMAND_ID_CONFLICT",
        `Command ID "${input.commandId}" was already used with different command data`
      );
    }
  }
}
