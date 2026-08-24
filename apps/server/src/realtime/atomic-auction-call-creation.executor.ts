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
  CommandRegistryRepository
} from "./command-registry.repository.js";

export type AtomicAuctionCallCreationErrorCode =
  | "AUCTION_SESSION_STATE_NOT_FOUND"
  | "AUCTION_SESSION_NOT_RUNNING"
  | "OPERATIONAL_AUCTION_CALL_ALREADY_EXISTS"
  | "STALE_STATE"
  | "COMMAND_ID_CONFLICT"
  | "AUCTION_CALL_SAVE_FAILED";

export class AtomicAuctionCallCreationError
  extends Error
{
  readonly code:
    AtomicAuctionCallCreationErrorCode;

  constructor(
    code: AtomicAuctionCallCreationErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AtomicAuctionCallCreationError";
    this.code = code;
  }
}

export type ExecuteAtomicAuctionCallCreationInput = {
  auctionSessionId: string;
  auctionCallId: string;
  commandId: string;
  expectedStateVersion: number;
  requestFingerprint: string;
  create: (
    executor: DatabaseWriteExecutor
  ) => AuctionCallAggregate;
};

export type ExecuteAtomicAuctionCallCreationResult = {
  aggregate: AuctionCallAggregate;
  stateVersion: number;
  idempotentReplay: boolean;
};

export class AtomicAuctionCallCreationExecutor {
  constructor(
    private readonly auctionCallRepository:
      AuctionCallRepository,
    private readonly stateRepository:
      AuctionSessionStateRepository,
    private readonly commandRegistryRepository:
      CommandRegistryRepository
  ) {}

  async execute(
    input: ExecuteAtomicAuctionCallCreationInput
  ): Promise<ExecuteAtomicAuctionCallCreationResult> {
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
            "AUCTION_CALL"
        ) {
          throw new AtomicAuctionCallCreationError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with a different command scope`
          );
        }

        const matches =
          existingCommand.auctionCallId ===
            input.auctionCallId &&
          existingCommand.commandType ===
            "CREATE" &&
          existingCommand.expectedStateVersion ===
            input.expectedStateVersion &&
          existingCommand.requestFingerprint ===
            input.requestFingerprint;

        if (!matches) {
          throw new AtomicAuctionCallCreationError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with different command data`
          );
        }

        return {
          aggregate:
            existingCommand.result,
          stateVersion:
            existingCommand.resultStateVersion,
          idempotentReplay: true
        };
      }

      const state =
        this.stateRepository
          .findByAuctionSessionIdWithExecutor(
            tx,
            input.auctionSessionId
          );

      if (!state) {
        throw new AtomicAuctionCallCreationError(
          "AUCTION_SESSION_STATE_NOT_FOUND",
          `Auction session "${input.auctionSessionId}" was not found`
        );
      }

      if (state.status !== "RUNNING") {
        throw new AtomicAuctionCallCreationError(
          "AUCTION_SESSION_NOT_RUNNING",
          `Auction session "${input.auctionSessionId}" must be RUNNING to create an auction call`
        );
      }

      if (
        state.stateVersion !==
        input.expectedStateVersion
      ) {
        throw new AtomicAuctionCallCreationError(
          "STALE_STATE",
          `Expected stateVersion ${input.expectedStateVersion}, current stateVersion is ${state.stateVersion}`
        );
      }

      const operationalCall =
        this.auctionCallRepository
          .findOperationalByAuctionSessionIdWithExecutor(
            tx,
            input.auctionSessionId
          );

      if (operationalCall) {
        throw new AtomicAuctionCallCreationError(
          "OPERATIONAL_AUCTION_CALL_ALREADY_EXISTS",
          `Auction session "${input.auctionSessionId}" already has an operational auction call`
        );
      }

      const aggregate =
        input.create(tx);

      if (
        aggregate.call.id !==
          input.auctionCallId ||
        aggregate.call.auctionSessionId !==
          input.auctionSessionId ||
        aggregate.call.status !== "DRAFT"
      ) {
        throw new AtomicAuctionCallCreationError(
          "AUCTION_CALL_SAVE_FAILED",
          "Created auction call aggregate does not match the requested DRAFT"
        );
      }

      const savedId =
        this.auctionCallRepository
          .saveWithExecutor(
            tx,
            aggregate
          );

      if (savedId !== input.auctionCallId) {
        throw new AtomicAuctionCallCreationError(
          "AUCTION_CALL_SAVE_FAILED",
          `Failed to save auction call "${input.auctionCallId}"`
        );
      }

      const persistedAggregate =
        this.auctionCallRepository
          .findByIdWithExecutor(
            tx,
            input.auctionCallId
          );

      if (!persistedAggregate) {
        throw new AtomicAuctionCallCreationError(
          "AUCTION_CALL_SAVE_FAILED",
          `Auction call "${input.auctionCallId}" was not found after save`
        );
      }

      const resultStateVersion =
        this.stateRepository
          .incrementStateVersionIfMatchesWithExecutor(
            tx,
            input.auctionSessionId,
            input.expectedStateVersion
          );

      if (resultStateVersion === null) {
        throw new AtomicAuctionCallCreationError(
          "STALE_STATE",
          `Auction session "${input.auctionSessionId}" state changed during auction call creation`
        );
      }

      const registeredCommand =
        this.commandRegistryRepository
          .createWithExecutor(
            tx,
            {
              auctionSessionId:
                input.auctionSessionId,
              auctionCallId:
                input.auctionCallId,
              commandId:
                input.commandId,
              commandType: "CREATE",
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
}
