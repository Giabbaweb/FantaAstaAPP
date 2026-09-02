import type {
  RosterAssignmentRemovalInput,
  RosterAssignmentRemovalResult,
  RosterAssignmentRemovalService
} from "../services/roster-assignment-removal.service.js";

import {
  db
} from "../db/client.js";
import type {
  AuctionEventRepository
} from "../repositories/auction-event.repository.js";
import type {
  AuctionCallRepository
} from "../repositories/auction-call.repository.js";
import type {
  AuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import type {
  CommandRegistryRepository,
  RegisteredRosterAssignmentRemovalCommandType
} from "./command-registry.repository.js";

export type AtomicRosterAssignmentRemovalCommandExecutorErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "OPERATIONAL_AUCTION_CALL_EXISTS"
  | "STALE_STATE"
  | "COMMAND_ID_CONFLICT";

export class AtomicRosterAssignmentRemovalCommandExecutorError
  extends Error
{
  readonly code:
    AtomicRosterAssignmentRemovalCommandExecutorErrorCode;

  constructor(
    code:
      AtomicRosterAssignmentRemovalCommandExecutorErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AtomicRosterAssignmentRemovalCommandExecutorError";
    this.code = code;
  }
}

export type ExecuteAtomicRosterAssignmentRemovalCommandInput = {
  commandId: string;
  commandType:
    RegisteredRosterAssignmentRemovalCommandType;
  expectedStateVersion: number;
  requestFingerprint: string;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment: string;
  removal:
    RosterAssignmentRemovalInput;
};

export type ExecuteAtomicRosterAssignmentRemovalCommandResult = {
  removal:
    RosterAssignmentRemovalResult;
  stateVersion: number;
  idempotentReplay: boolean;
};

export class AtomicRosterAssignmentRemovalCommandExecutor {
  constructor(
    private readonly stateRepository:
      AuctionSessionStateRepository,
    private readonly commandRegistryRepository:
      CommandRegistryRepository,
    private readonly rosterAssignmentRemovalService:
      RosterAssignmentRemovalService,
    private readonly auctionCallRepository:
      Pick<
        AuctionCallRepository,
        "findOperationalByAuctionSessionIdWithExecutor"
      >,
    private readonly auctionEventRepository:
      AuctionEventRepository
  ) {}

  async execute(
    input:
      ExecuteAtomicRosterAssignmentRemovalCommandInput
  ): Promise<
    ExecuteAtomicRosterAssignmentRemovalCommandResult
  > {
    return db.transaction((tx) => {
      const auctionSessionId =
        input.removal.auctionSessionId;

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
            "REMOVE_ROSTER_ASSIGNMENT"
        ) {
          throw new AtomicRosterAssignmentRemovalCommandExecutorError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with a different command scope or type`
          );
        }

        this.assertMatchingCommand(
          existingCommand,
          input
        );

        return {
          removal:
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
        throw new AtomicRosterAssignmentRemovalCommandExecutorError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (
        currentStateVersion !==
          input.expectedStateVersion
      ) {
        throw new AtomicRosterAssignmentRemovalCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" expected state version ${input.expectedStateVersion}, but current version is ${currentStateVersion}`
        );
      }

      const operationalAuctionCall =
        this.auctionCallRepository
          .findOperationalByAuctionSessionIdWithExecutor(
            tx,
            auctionSessionId
          );

      if (operationalAuctionCall) {
        throw new AtomicRosterAssignmentRemovalCommandExecutorError(
          "OPERATIONAL_AUCTION_CALL_EXISTS",
          `Auction session "${auctionSessionId}" has an operational auction call`
        );
      }

      const removal =
        this.rosterAssignmentRemovalService
          .executeWithExecutor(
            tx,
            input.removal
          );

      const resultStateVersion =
        this.stateRepository
          .incrementStateVersionIfMatchesWithExecutor(
            tx,
            auctionSessionId,
            input.expectedStateVersion
          );

      if (resultStateVersion === null) {
        throw new AtomicRosterAssignmentRemovalCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" no longer matches state version ${input.expectedStateVersion}`
        );
      }

      this.auctionEventRepository
        .createWithExecutor(
          tx,
          {
            auctionSessionId,
            eventType:
              "ROSTER_ASSIGNMENT_REMOVED",

            actorName:
              input.actorName,
            actorRole:
              input.actorRole,
            comment:
              input.comment,

            beforeAuctionSessionTeamId:
              removal.removed
                .auctionSessionTeamId,
            beforePlayerId:
              removal.removed.playerId,
            beforeAmount:
              removal.removed
                .acquisitionCost,
            beforeContractYear:
              removal.removed
                .rosterEntry.contractYear
          }
        );

      const registeredCommand =
        this.commandRegistryRepository
          .createRosterAssignmentRemovalCommandWithExecutor(
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
                removal
            }
          );

      return {
        removal:
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
        RegisteredRosterAssignmentRemovalCommandType;
      expectedStateVersion: number;
      requestFingerprint: string;
    },
    input:
      ExecuteAtomicRosterAssignmentRemovalCommandInput
  ): void {
    const matches =
      existingCommand.commandType ===
        input.commandType &&
      existingCommand.expectedStateVersion ===
        input.expectedStateVersion &&
      existingCommand.requestFingerprint ===
        input.requestFingerprint;

    if (!matches) {
      throw new AtomicRosterAssignmentRemovalCommandExecutorError(
        "COMMAND_ID_CONFLICT",
        `Command ID "${input.commandId}" was already used with different command data`
      );
    }
  }
}
