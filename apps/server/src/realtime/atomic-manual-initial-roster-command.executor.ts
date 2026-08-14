import type {
  RosterEntry
} from "@fantaastaapp/domain";

import {
  db
} from "../db/client.js";
import type {
  ManualInitialRosterEntryInput,
  ManualInitialRosterEntryService
} from "../services/manual-initial-roster-entry.service.js";
import type {
  AuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import type {
  CommandRegistryRepository,
  RegisteredManualInitialRosterCommandType
} from "./command-registry.repository.js";

export type AtomicManualInitialRosterCommandExecutorErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "STALE_STATE"
  | "COMMAND_ID_CONFLICT";

export class AtomicManualInitialRosterCommandExecutorError
  extends Error
{
  readonly code:
    AtomicManualInitialRosterCommandExecutorErrorCode;

  constructor(
    code: AtomicManualInitialRosterCommandExecutorErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AtomicManualInitialRosterCommandExecutorError";
    this.code = code;
  }
}

export type ExecuteAtomicManualInitialRosterCommandInput = {
  commandId: string;
  commandType:
    RegisteredManualInitialRosterCommandType;
  expectedStateVersion: number;
  requestFingerprint: string;
  entry: ManualInitialRosterEntryInput;
};

export type ExecuteAtomicManualInitialRosterCommandResult = {
  rosterEntry: RosterEntry;
  stateVersion: number;
  idempotentReplay: boolean;
};

export class AtomicManualInitialRosterCommandExecutor {
  constructor(
    private readonly stateRepository:
      AuctionSessionStateRepository,
    private readonly commandRegistryRepository:
      CommandRegistryRepository,
    private readonly manualInitialRosterEntryService:
      ManualInitialRosterEntryService
  ) {}

  async execute(
    input: ExecuteAtomicManualInitialRosterCommandInput
  ): Promise<ExecuteAtomicManualInitialRosterCommandResult> {
    return db.transaction((tx) => {
      const auctionSessionId =
        input.entry.auctionSessionId;

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
            "AUCTION_SESSION" ||
          existingCommand.commandType !==
            "ADD_MANUAL_INITIAL_ROSTER_ENTRY"
        ) {
          throw new AtomicManualInitialRosterCommandExecutorError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with a different command scope or type`
          );
        }

        this.assertMatchingCommand(
          existingCommand,
          input
        );

        return {
          rosterEntry:
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
            auctionSessionId
          );

      if (currentStateVersion === null) {
        throw new AtomicManualInitialRosterCommandExecutorError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (
        currentStateVersion !==
          input.expectedStateVersion
      ) {
        throw new AtomicManualInitialRosterCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" expected state version ${input.expectedStateVersion}, but current version is ${currentStateVersion}`
        );
      }

      const rosterEntry =
        this.manualInitialRosterEntryService
          .executeWithExecutor(
            tx,
            input.entry
          );

      const resultStateVersion =
        this.stateRepository
          .incrementStateVersionIfMatchesWithExecutor(
            tx,
            auctionSessionId,
            input.expectedStateVersion
          );

      if (resultStateVersion === null) {
        throw new AtomicManualInitialRosterCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" no longer matches state version ${input.expectedStateVersion}`
        );
      }

      const registeredCommand =
        this.commandRegistryRepository
          .createManualInitialRosterCommandWithExecutor(
            tx,
            {
              auctionSessionId,
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
                rosterEntry
            }
          );

      return {
        rosterEntry:
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
        RegisteredManualInitialRosterCommandType;
      expectedStateVersion: number;
      requestFingerprint: string;
    },
    input: ExecuteAtomicManualInitialRosterCommandInput
  ): void {
    const matches =
      existingCommand.commandType ===
        input.commandType &&
      existingCommand.expectedStateVersion ===
        input.expectedStateVersion &&
      existingCommand.requestFingerprint ===
        input.requestFingerprint;

    if (!matches) {
      throw new AtomicManualInitialRosterCommandExecutorError(
        "COMMAND_ID_CONFLICT",
        `Command ID "${input.commandId}" was already used with different command data`
      );
    }
  }
}
