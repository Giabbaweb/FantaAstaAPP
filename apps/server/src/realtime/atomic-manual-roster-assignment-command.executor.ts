import type {
  ManualRosterAssignmentReason,
  RosterEntry
} from "@fantaastaapp/domain";

import {
  db
} from "../db/client.js";
import type {
  AuctionEventRepository
} from "../repositories/auction-event.repository.js";
import type {
  AuctionSessionTeamTransactionalRepository
} from "../repositories/auction-session-team.repository.js";
import type {
  ManualRosterAssignmentInput,
  ManualRosterAssignmentService
} from "../services/manual-roster-assignment.service.js";
import type {
  AuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import type {
  CommandRegistryRepository,
  RegisteredManualRosterAssignmentCommandType
} from "./command-registry.repository.js";

export type AtomicManualRosterAssignmentCommandExecutorErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "STALE_STATE"
  | "COMMAND_ID_CONFLICT";

export class AtomicManualRosterAssignmentCommandExecutorError
  extends Error
{
  readonly code:
    AtomicManualRosterAssignmentCommandExecutorErrorCode;

  constructor(
    code:
      AtomicManualRosterAssignmentCommandExecutorErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AtomicManualRosterAssignmentCommandExecutorError";
    this.code = code;
  }
}

export type ExecuteAtomicManualRosterAssignmentCommandInput = {
  commandId: string;
  commandType:
    RegisteredManualRosterAssignmentCommandType;
  expectedStateVersion: number;
  requestFingerprint: string;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  manualAssignmentReason:
    ManualRosterAssignmentReason;
  comment?: string | null;
  assignment: ManualRosterAssignmentInput;
};

export type ExecuteAtomicManualRosterAssignmentCommandResult = {
  rosterEntry: RosterEntry;
  stateVersion: number;
  idempotentReplay: boolean;
};

export class AtomicManualRosterAssignmentCommandExecutor {
  constructor(
    private readonly stateRepository:
      AuctionSessionStateRepository,
    private readonly commandRegistryRepository:
      CommandRegistryRepository,
    private readonly manualRosterAssignmentService:
      ManualRosterAssignmentService,
    private readonly auctionSessionTeamRepository:
      AuctionSessionTeamTransactionalRepository,
    private readonly auctionEventRepository:
      AuctionEventRepository
  ) {}

  async execute(
    input:
      ExecuteAtomicManualRosterAssignmentCommandInput
  ): Promise<
    ExecuteAtomicManualRosterAssignmentCommandResult
  > {
    return db.transaction((tx) => {
      const auctionSessionId =
        input.assignment.auctionSessionId;

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
            "ADD_MANUAL_ROSTER_ASSIGNMENT"
        ) {
          throw new AtomicManualRosterAssignmentCommandExecutorError(
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
        throw new AtomicManualRosterAssignmentCommandExecutorError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (
        currentStateVersion !==
          input.expectedStateVersion
      ) {
        throw new AtomicManualRosterAssignmentCommandExecutorError(
          "STALE_STATE",
          `Auction session "${auctionSessionId}" expected state version ${input.expectedStateVersion}, but current version is ${currentStateVersion}`
        );
      }

      const auctionSessionTeam =
        this.auctionSessionTeamRepository
          .findByIdWithExecutor(
            tx,
            input.assignment.auctionSessionTeamId
          );

      if (!auctionSessionTeam) {
        throw new Error(
          `Auction session team "${input.assignment.auctionSessionTeamId}" was not found before manual roster assignment`
        );
      }

      const creditsBefore =
        auctionSessionTeam.remainingCredits;

      const rosterEntry =
        this.manualRosterAssignmentService
          .executeWithExecutor(
            tx,
            input.assignment
          );

      const creditsAfter =
        creditsBefore -
        input.assignment.acquisitionCost;

      const resultStateVersion =
        this.stateRepository
          .incrementStateVersionIfMatchesWithExecutor(
            tx,
            auctionSessionId,
            input.expectedStateVersion
          );

      if (resultStateVersion === null) {
        throw new AtomicManualRosterAssignmentCommandExecutorError(
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
              "MANUAL_ROSTER_ASSIGNMENT_ADDED",
            auctionSessionTeamId:
              input.assignment.auctionSessionTeamId,
            playerId:
              input.assignment.playerId,
            amount:
              input.assignment.acquisitionCost,
            creditsBefore,
            creditsAfter,
            contractYear:
              input.assignment.contractYear,
            actorName:
              input.actorName,
            actorRole:
              input.actorRole,
            comment:
              input.comment ?? null,
            manualAssignmentReason:
              input.manualAssignmentReason
          }
        );

      const registeredCommand =
        this.commandRegistryRepository
          .createManualRosterAssignmentCommandWithExecutor(
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
        RegisteredManualRosterAssignmentCommandType;
      expectedStateVersion: number;
      requestFingerprint: string;
    },
    input:
      ExecuteAtomicManualRosterAssignmentCommandInput
  ): void {
    const matches =
      existingCommand.commandType ===
        input.commandType &&
      existingCommand.expectedStateVersion ===
        input.expectedStateVersion &&
      existingCommand.requestFingerprint ===
        input.requestFingerprint;

    if (!matches) {
      throw new AtomicManualRosterAssignmentCommandExecutorError(
        "COMMAND_ID_CONFLICT",
        `Command ID "${input.commandId}" was already used with different command data`
      );
    }
  }
}
