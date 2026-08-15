import type {
  TechnicalRosterCorrectionResult
} from "../services/technical-roster-correction.service.js";
import type {
  TechnicalRosterCorrectionInput,
  TechnicalRosterCorrectionService
} from "../services/technical-roster-correction.service.js";

import {
  db
} from "../db/client.js";
import type {
  AuctionEventRepository
} from "../repositories/auction-event.repository.js";
import type {
  AuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import type {
  CommandRegistryRepository,
  RegisteredTechnicalRosterCorrectionCommandType
} from "./command-registry.repository.js";

export type AtomicTechnicalRosterCorrectionCommandExecutorErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "STALE_STATE"
  | "COMMAND_ID_CONFLICT";

export class AtomicTechnicalRosterCorrectionCommandExecutorError
  extends Error
{
  readonly code:
    AtomicTechnicalRosterCorrectionCommandExecutorErrorCode;

  constructor(
    code:
      AtomicTechnicalRosterCorrectionCommandExecutorErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AtomicTechnicalRosterCorrectionCommandExecutorError";
    this.code = code;
  }
}

export type ExecuteAtomicTechnicalRosterCorrectionCommandInput = {
  commandId: string;
  commandType:
    RegisteredTechnicalRosterCorrectionCommandType;
  expectedStateVersion: number;
  requestFingerprint: string;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment: string;
  correction:
    TechnicalRosterCorrectionInput;
};

export type ExecuteAtomicTechnicalRosterCorrectionCommandResult = {
  correction:
    TechnicalRosterCorrectionResult;
  stateVersion: number;
  idempotentReplay: boolean;
};

export class AtomicTechnicalRosterCorrectionCommandExecutor {
  constructor(
    private readonly stateRepository:
      AuctionSessionStateRepository,
    private readonly commandRegistryRepository:
      CommandRegistryRepository,
    private readonly technicalRosterCorrectionService:
      TechnicalRosterCorrectionService,
    private readonly auctionEventRepository:
      AuctionEventRepository
  ) {}

  async execute(
    input:
      ExecuteAtomicTechnicalRosterCorrectionCommandInput
  ): Promise<
    ExecuteAtomicTechnicalRosterCorrectionCommandResult
  > {
    return db.transaction((tx) => {
      const auctionSessionId =
        input.correction.auctionSessionId;

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
            "TECHNICAL_ROSTER_CORRECTION"
        ) {
          throw new AtomicTechnicalRosterCorrectionCommandExecutorError(
            "COMMAND_ID_CONFLICT",
            `Command ID "${input.commandId}" was already used with a different command scope or type`
          );
        }

        this.assertMatchingCommand(
          existingCommand,
          input
        );

        return {
          correction:
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
        throw new AtomicTechnicalRosterCorrectionCommandExecutorError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (
        currentStateVersion !==
          input.expectedStateVersion
      ) {
        throw new AtomicTechnicalRosterCorrectionCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" expected state version ${input.expectedStateVersion}, but current version is ${currentStateVersion}`
        );
      }

      const correction =
        this.technicalRosterCorrectionService
          .executeWithExecutor(
            tx,
            input.correction
          );

      const resultStateVersion =
        this.stateRepository
          .incrementStateVersionIfMatchesWithExecutor(
            tx,
            auctionSessionId,
            input.expectedStateVersion
          );

      if (resultStateVersion === null) {
        throw new AtomicTechnicalRosterCorrectionCommandExecutorError(
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
              "TECHNICAL_ROSTER_CORRECTION",

            actorName:
              input.actorName,
            actorRole:
              input.actorRole,
            comment:
              input.comment,

            beforeAuctionSessionTeamId:
              correction.before
                .auctionSessionTeamId,
            beforePlayerId:
              correction.before.playerId,
            beforeAmount:
              correction.before
                .acquisitionCost,
            beforeContractYear:
              correction.before.contractYear,

            afterAuctionSessionTeamId:
              correction.after
                .auctionSessionTeamId,
            afterPlayerId:
              correction.after.playerId,
            afterAmount:
              correction.after
                .acquisitionCost,
            afterContractYear:
              correction.after.contractYear
          }
        );

      const registeredCommand =
        this.commandRegistryRepository
          .createTechnicalRosterCorrectionCommandWithExecutor(
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
                correction
            }
          );

      return {
        correction:
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
        RegisteredTechnicalRosterCorrectionCommandType;
      expectedStateVersion: number;
      requestFingerprint: string;
    },
    input:
      ExecuteAtomicTechnicalRosterCorrectionCommandInput
  ): void {
    const matches =
      existingCommand.commandType ===
        input.commandType &&
      existingCommand.expectedStateVersion ===
        input.expectedStateVersion &&
      existingCommand.requestFingerprint ===
        input.requestFingerprint;

    if (!matches) {
      throw new AtomicTechnicalRosterCorrectionCommandExecutorError(
        "COMMAND_ID_CONFLICT",
        `Command ID "${input.commandId}" was already used with different command data`
      );
    }
  }
}
