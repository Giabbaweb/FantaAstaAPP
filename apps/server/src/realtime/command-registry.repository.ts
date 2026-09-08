import {
  randomUUID
} from "node:crypto";

import {
  and,
  eq
} from "drizzle-orm";

import {
  auctionSessionSchema,
  realtimeOperationalAuctionCallSchema,
  rosterEntrySchema
} from "@fantaastaapp/contracts";
import type {
  AuctionSession,
  RosterEntry
} from "@fantaastaapp/contracts";

import {
  db
} from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
  commandRegistry
} from "../db/schema/index.js";
import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";

export type RegisteredAuctionCommandType =
  | "CREATE"
  | "OPEN"
  | "BID"
  | "PASS"
  | "UNDO_PASS"
  | "CONFIRM"
  | "CANCEL";

export type RegisteredAuctionSessionCommandType =
  | "START_SESSION"
  | "SUSPEND_SESSION"
  | "RESUME_SESSION"
  | "REOPEN_SESSION";

export type RegisteredManualRosterCommandType =
  | "ADD_MANUAL_INITIAL_ROSTER_ENTRY"
  | "ADD_MANUAL_ROSTER_ASSIGNMENT"
  | "TECHNICAL_ROSTER_CORRECTION"
  | "REMOVE_ROSTER_ASSIGNMENT";

export type RegisteredManualInitialRosterCommandType =
  Extract<
    RegisteredManualRosterCommandType,
    "ADD_MANUAL_INITIAL_ROSTER_ENTRY"
  >;

export type RegisteredManualRosterAssignmentCommandType =
  Extract<
    RegisteredManualRosterCommandType,
    "ADD_MANUAL_ROSTER_ASSIGNMENT"
  >;

export type RegisteredTechnicalRosterCorrectionCommandType =
  Extract<
    RegisteredManualRosterCommandType,
    "TECHNICAL_ROSTER_CORRECTION"
  >;

export type RegisteredRosterAssignmentRemovalCommandType =
  Extract<
    RegisteredManualRosterCommandType,
    "REMOVE_ROSTER_ASSIGNMENT"
  >;

type RegisteredCommandBase = {
  id: string;
  auctionSessionId: string;
  commandId: string;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  createdAt: string;
};

export type RegisteredAuctionCommand =
  RegisteredCommandBase & {
    commandScope: "AUCTION_CALL";
    auctionCallId: string;
    commandType: RegisteredAuctionCommandType;
    result: AuctionCallAggregate;
  };

export type RegisteredAuctionSessionCommand =
  RegisteredCommandBase & {
    commandScope: "AUCTION_SESSION";
    auctionCallId: null;
    commandType:
      RegisteredAuctionSessionCommandType;
    result: AuctionSession;
  };

export type RegisteredManualInitialRosterCommand =
  RegisteredCommandBase & {
    commandScope: "AUCTION_SESSION";
    auctionCallId: null;
    commandType:
      RegisteredManualInitialRosterCommandType;
    result: RosterEntry;
  };

export type RegisteredManualRosterAssignmentCommand =
  RegisteredCommandBase & {
    commandScope: "AUCTION_SESSION";
    auctionCallId: null;
    commandType:
      RegisteredManualRosterAssignmentCommandType;
    result: RosterEntry;
  };

export type RegisteredTechnicalRosterCorrectionSnapshot = {
  rosterEntry: RosterEntry;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: 1 | 2 | 3;
};

export type RegisteredTechnicalRosterCorrectionResult = {
  before: RegisteredTechnicalRosterCorrectionSnapshot;
  after: RegisteredTechnicalRosterCorrectionSnapshot;
};

export type RegisteredTechnicalRosterCorrectionCommand =
  RegisteredCommandBase & {
    commandScope: "AUCTION_SESSION";
    auctionCallId: null;
    commandType:
      RegisteredTechnicalRosterCorrectionCommandType;
    result:
      RegisteredTechnicalRosterCorrectionResult;
  };

export type RegisteredRosterAssignmentRemovalSnapshot = {
  rosterEntry: RosterEntry;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
};

export type RegisteredRosterAssignmentRemovalResult = {
  removed:
    RegisteredRosterAssignmentRemovalSnapshot;
  remainingCreditsAfterRemoval: number;
};

export type RegisteredRosterAssignmentRemovalCommand =
  RegisteredCommandBase & {
    commandScope: "AUCTION_SESSION";
    auctionCallId: null;
    commandType:
      RegisteredRosterAssignmentRemovalCommandType;
    result:
      RegisteredRosterAssignmentRemovalResult;
  };

export type RegisteredCommand =
  | RegisteredAuctionCommand
  | RegisteredAuctionSessionCommand
  | RegisteredManualInitialRosterCommand
  | RegisteredManualRosterAssignmentCommand
  | RegisteredTechnicalRosterCorrectionCommand
  | RegisteredRosterAssignmentRemovalCommand;

export type RegisterAuctionCommandInput = {
  auctionSessionId: string;
  auctionCallId: string;
  commandId: string;
  commandType: RegisteredAuctionCommandType;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  result: AuctionCallAggregate;
};

export type RegisterAuctionSessionCommandInput = {
  auctionSessionId: string;
  commandId: string;
  commandType:
    RegisteredAuctionSessionCommandType;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  result: AuctionSession;
};

export type RegisterManualInitialRosterCommandInput = {
  auctionSessionId: string;
  commandId: string;
  commandType:
    RegisteredManualInitialRosterCommandType;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  result: RosterEntry;
};

export type RegisterManualRosterAssignmentCommandInput = {
  auctionSessionId: string;
  commandId: string;
  commandType:
    RegisteredManualRosterAssignmentCommandType;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  result: RosterEntry;
};

export type RegisterTechnicalRosterCorrectionCommandInput = {
  auctionSessionId: string;
  commandId: string;
  commandType:
    RegisteredTechnicalRosterCorrectionCommandType;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  result:
    RegisteredTechnicalRosterCorrectionResult;
};

export type RegisterRosterAssignmentRemovalCommandInput = {
  auctionSessionId: string;
  commandId: string;
  commandType:
    RegisteredRosterAssignmentRemovalCommandType;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  result:
    RegisteredRosterAssignmentRemovalResult;
};

function parseTechnicalRosterCorrectionSnapshot(
  payload: unknown
): RegisteredTechnicalRosterCorrectionSnapshot | null {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return null;
  }

  const candidate =
    payload as Record<string, unknown>;

  const parsedRosterEntry =
    rosterEntrySchema.safeParse(
      candidate.rosterEntry
    );

  if (!parsedRosterEntry.success) {
    return null;
  }

  const contractYear =
    candidate.contractYear;

  if (
    typeof candidate.auctionSessionTeamId !==
      "string" ||
    candidate.auctionSessionTeamId.length === 0 ||
    typeof candidate.playerId !== "string" ||
    candidate.playerId.length === 0 ||
    typeof candidate.acquisitionCost !==
      "number" ||
    !Number.isInteger(
      candidate.acquisitionCost
    ) ||
    candidate.acquisitionCost <= 0 ||
    (
      contractYear !== 1 &&
      contractYear !== 2 &&
      contractYear !== 3
    )
  ) {
    return null;
  }

  return {
    rosterEntry:
      parsedRosterEntry.data,
    auctionSessionTeamId:
      candidate.auctionSessionTeamId,
    playerId:
      candidate.playerId,
    acquisitionCost:
      candidate.acquisitionCost,
    contractYear
  };
}

function parseTechnicalRosterCorrectionResult(
  payload: unknown
): RegisteredTechnicalRosterCorrectionResult | null {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return null;
  }

  const candidate =
    payload as Record<string, unknown>;

  const before =
    parseTechnicalRosterCorrectionSnapshot(
      candidate.before
    );

  const after =
    parseTechnicalRosterCorrectionSnapshot(
      candidate.after
    );

  if (!before || !after) {
    return null;
  }

  return {
    before,
    after
  };
}

function parseRosterAssignmentRemovalSnapshot(
  payload: unknown
): RegisteredRosterAssignmentRemovalSnapshot | null {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return null;
  }

  const candidate =
    payload as Record<string, unknown>;

  const parsedRosterEntry =
    rosterEntrySchema.safeParse(
      candidate.rosterEntry
    );

  if (!parsedRosterEntry.success) {
    return null;
  }

  if (
    typeof candidate.auctionSessionTeamId !==
      "string" ||
    candidate.auctionSessionTeamId.length === 0 ||
    typeof candidate.playerId !== "string" ||
    candidate.playerId.length === 0 ||
    typeof candidate.acquisitionCost !==
      "number" ||
    !Number.isInteger(
      candidate.acquisitionCost
    ) ||
    candidate.acquisitionCost <= 0
  ) {
    return null;
  }

  return {
    rosterEntry:
      parsedRosterEntry.data,
    auctionSessionTeamId:
      candidate.auctionSessionTeamId,
    playerId:
      candidate.playerId,
    acquisitionCost:
      candidate.acquisitionCost
  };
}

function parseRosterAssignmentRemovalResult(
  payload: unknown
): RegisteredRosterAssignmentRemovalResult | null {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return null;
  }

  const candidate =
    payload as Record<string, unknown>;

  const removed =
    parseRosterAssignmentRemovalSnapshot(
      candidate.removed
    );

  if (
    !removed ||
    typeof candidate.remainingCreditsAfterRemoval !==
      "number" ||
    !Number.isInteger(
      candidate.remainingCreditsAfterRemoval
    ) ||
    candidate.remainingCreditsAfterRemoval < 0
  ) {
    return null;
  }

  return {
    removed,
    remainingCreditsAfterRemoval:
      candidate.remainingCreditsAfterRemoval
  };
}

export interface CommandRegistryRepository {
  findByCommandId(
    auctionSessionId: string,
    commandId: string
  ): Promise<RegisteredCommand | null>;

  findByCommandIdWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string,
    commandId: string
  ): RegisteredCommand | null;

  create(
    input: RegisterAuctionCommandInput
  ): Promise<RegisteredAuctionCommand>;

  createWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterAuctionCommandInput
  ): RegisteredAuctionCommand;

  createSessionCommand(
    input: RegisterAuctionSessionCommandInput
  ): Promise<RegisteredAuctionSessionCommand>;

  createSessionCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterAuctionSessionCommandInput
  ): RegisteredAuctionSessionCommand;

  createManualInitialRosterCommand(
    input: RegisterManualInitialRosterCommandInput
  ): Promise<RegisteredManualInitialRosterCommand>;

  createManualInitialRosterCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterManualInitialRosterCommandInput
  ): RegisteredManualInitialRosterCommand;

  createManualRosterAssignmentCommand(
    input: RegisterManualRosterAssignmentCommandInput
  ): Promise<RegisteredManualRosterAssignmentCommand>;

  createManualRosterAssignmentCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterManualRosterAssignmentCommandInput
  ): RegisteredManualRosterAssignmentCommand;

  createTechnicalRosterCorrectionCommand(
    input: RegisterTechnicalRosterCorrectionCommandInput
  ): Promise<RegisteredTechnicalRosterCorrectionCommand>;

  createTechnicalRosterCorrectionCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterTechnicalRosterCorrectionCommandInput
  ): RegisteredTechnicalRosterCorrectionCommand;

  createRosterAssignmentRemovalCommand(
    input: RegisterRosterAssignmentRemovalCommandInput
  ): Promise<RegisteredRosterAssignmentRemovalCommand>;

  createRosterAssignmentRemovalCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterRosterAssignmentRemovalCommandInput
  ): RegisteredRosterAssignmentRemovalCommand;
}

export class SqliteCommandRegistryRepository
  implements CommandRegistryRepository
{
  async findByCommandId(
    auctionSessionId: string,
    commandId: string
  ): Promise<RegisteredCommand | null> {
    return this.findByCommandIdWithExecutor(
      db,
      auctionSessionId,
      commandId
    );
  }

  findByCommandIdWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string,
    commandId: string
  ): RegisteredCommand | null {
    const [record] = executor
      .select()
      .from(commandRegistry)
      .where(
        and(
          eq(
            commandRegistry.auctionSessionId,
            auctionSessionId
          ),
          eq(
            commandRegistry.commandId,
            commandId
          )
        )
      )
      .limit(1)
      .all();

    if (!record) {
      return null;
    }

    return this.mapRecord(record);
  }

  async create(
    input: RegisterAuctionCommandInput
  ): Promise<RegisteredAuctionCommand> {
    return this.createWithExecutor(
      db,
      input
    );
  }

  createWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterAuctionCommandInput
  ): RegisteredAuctionCommand {
    const [record] = executor
      .insert(commandRegistry)
      .values({
        id: randomUUID(),
        auctionSessionId:
          input.auctionSessionId,
        commandScope:
          "AUCTION_CALL",
        auctionCallId:
          input.auctionCallId,
        commandId:
          input.commandId,
        commandType:
          input.commandType,
        expectedStateVersion:
          input.expectedStateVersion,
        resultStateVersion:
          input.resultStateVersion,
        requestFingerprint:
          input.requestFingerprint,
        resultPayload:
          JSON.stringify(input.result)
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        `Failed to register command "${input.commandId}"`
      );
    }

    const mapped = this.mapRecord(record);

    if (mapped.commandScope !== "AUCTION_CALL") {
      throw new Error(
        `Command "${input.commandId}" has an invalid command scope`
      );
    }

    return mapped;
  }

  async createSessionCommand(
    input: RegisterAuctionSessionCommandInput
  ): Promise<RegisteredAuctionSessionCommand> {
    return this.createSessionCommandWithExecutor(
      db,
      input
    );
  }

  createSessionCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterAuctionSessionCommandInput
  ): RegisteredAuctionSessionCommand {
    const [record] = executor
      .insert(commandRegistry)
      .values({
        id: randomUUID(),
        auctionSessionId:
          input.auctionSessionId,
        commandScope:
          "AUCTION_SESSION",
        auctionCallId:
          null,
        commandId:
          input.commandId,
        commandType:
          input.commandType,
        expectedStateVersion:
          input.expectedStateVersion,
        resultStateVersion:
          input.resultStateVersion,
        requestFingerprint:
          input.requestFingerprint,
        resultPayload:
          JSON.stringify(input.result)
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        `Failed to register session command "${input.commandId}"`
      );
    }

    const mapped = this.mapRecord(record);

    if (
      mapped.commandScope !== "AUCTION_SESSION" ||
      (
        mapped.commandType !== "START_SESSION" &&
        mapped.commandType !== "SUSPEND_SESSION" &&
        mapped.commandType !== "RESUME_SESSION" &&
        mapped.commandType !== "REOPEN_SESSION"
      )
    ) {
      throw new Error(
        `Command "${input.commandId}" has an invalid command type`
      );
    }

    return mapped;
  }

  async createManualInitialRosterCommand(
    input: RegisterManualInitialRosterCommandInput
  ): Promise<RegisteredManualInitialRosterCommand> {
    return this.createManualInitialRosterCommandWithExecutor(
      db,
      input
    );
  }

  createManualInitialRosterCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterManualInitialRosterCommandInput
  ): RegisteredManualInitialRosterCommand {
    const [record] = executor
      .insert(commandRegistry)
      .values({
        id: randomUUID(),
        auctionSessionId:
          input.auctionSessionId,
        commandScope:
          "AUCTION_SESSION",
        auctionCallId:
          null,
        commandId:
          input.commandId,
        commandType:
          input.commandType,
        expectedStateVersion:
          input.expectedStateVersion,
        resultStateVersion:
          input.resultStateVersion,
        requestFingerprint:
          input.requestFingerprint,
        resultPayload:
          JSON.stringify(input.result)
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        `Failed to register manual initial roster command "${input.commandId}"`
      );
    }

    const mapped = this.mapRecord(record);

    if (
      mapped.commandScope !==
        "AUCTION_SESSION" ||
      mapped.commandType !==
        "ADD_MANUAL_INITIAL_ROSTER_ENTRY"
    ) {
      throw new Error(
        `Command "${input.commandId}" has an invalid command type`
      );
    }

    return mapped;
  }

  async createManualRosterAssignmentCommand(
    input: RegisterManualRosterAssignmentCommandInput
  ): Promise<RegisteredManualRosterAssignmentCommand> {
    return this.createManualRosterAssignmentCommandWithExecutor(
      db,
      input
    );
  }

  createManualRosterAssignmentCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterManualRosterAssignmentCommandInput
  ): RegisteredManualRosterAssignmentCommand {
    const [record] = executor
      .insert(commandRegistry)
      .values({
        id: randomUUID(),
        auctionSessionId:
          input.auctionSessionId,
        commandScope:
          "AUCTION_SESSION",
        auctionCallId:
          null,
        commandId:
          input.commandId,
        commandType:
          input.commandType,
        expectedStateVersion:
          input.expectedStateVersion,
        resultStateVersion:
          input.resultStateVersion,
        requestFingerprint:
          input.requestFingerprint,
        resultPayload:
          JSON.stringify(input.result)
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        `Failed to register manual roster assignment command "${input.commandId}"`
      );
    }

    const mapped = this.mapRecord(record);

    if (
      mapped.commandScope !==
        "AUCTION_SESSION" ||
      mapped.commandType !==
        "ADD_MANUAL_ROSTER_ASSIGNMENT"
    ) {
      throw new Error(
        `Command "${input.commandId}" has an invalid command type`
      );
    }

    return mapped;
  }

  async createTechnicalRosterCorrectionCommand(
    input: RegisterTechnicalRosterCorrectionCommandInput
  ): Promise<RegisteredTechnicalRosterCorrectionCommand> {
    return this.createTechnicalRosterCorrectionCommandWithExecutor(
      db,
      input
    );
  }

  createTechnicalRosterCorrectionCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterTechnicalRosterCorrectionCommandInput
  ): RegisteredTechnicalRosterCorrectionCommand {
    const [record] = executor
      .insert(commandRegistry)
      .values({
        id: randomUUID(),
        auctionSessionId:
          input.auctionSessionId,
        commandScope:
          "AUCTION_SESSION",
        auctionCallId: null,
        commandId:
          input.commandId,
        commandType:
          input.commandType,
        expectedStateVersion:
          input.expectedStateVersion,
        resultStateVersion:
          input.resultStateVersion,
        requestFingerprint:
          input.requestFingerprint,
        resultPayload:
          JSON.stringify(input.result)
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        `Failed to register technical roster correction command "${input.commandId}"`
      );
    }

    const mapped = this.mapRecord(record);

    if (
      mapped.commandScope !==
        "AUCTION_SESSION" ||
      mapped.commandType !==
        "TECHNICAL_ROSTER_CORRECTION"
    ) {
      throw new Error(
        `Command "${input.commandId}" has an invalid command type`
      );
    }

    return mapped;
  }

  async createRosterAssignmentRemovalCommand(
    input: RegisterRosterAssignmentRemovalCommandInput
  ): Promise<RegisteredRosterAssignmentRemovalCommand> {
    return this.createRosterAssignmentRemovalCommandWithExecutor(
      db,
      input
    );
  }

  createRosterAssignmentRemovalCommandWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterRosterAssignmentRemovalCommandInput
  ): RegisteredRosterAssignmentRemovalCommand {
    const [record] = executor
      .insert(commandRegistry)
      .values({
        id: randomUUID(),
        auctionSessionId:
          input.auctionSessionId,
        commandScope:
          "AUCTION_SESSION",
        auctionCallId: null,
        commandId:
          input.commandId,
        commandType:
          input.commandType,
        expectedStateVersion:
          input.expectedStateVersion,
        resultStateVersion:
          input.resultStateVersion,
        requestFingerprint:
          input.requestFingerprint,
        resultPayload:
          JSON.stringify(input.result)
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        `Failed to register roster assignment removal command "${input.commandId}"`
      );
    }

    const mapped = this.mapRecord(record);

    if (
      mapped.commandScope !==
        "AUCTION_SESSION" ||
      mapped.commandType !==
        "REMOVE_ROSTER_ASSIGNMENT"
    ) {
      throw new Error(
        `Command "${input.commandId}" has an invalid command type`
      );
    }

    return mapped;
  }

  private mapRecord(
    record: typeof commandRegistry.$inferSelect
  ): RegisteredCommand {
    let payload: unknown;

    try {
      payload =
        JSON.parse(record.resultPayload);
    } catch {
      throw new Error(
        `Command "${record.commandId}" has an invalid result payload`
      );
    }

    if (record.commandScope === "AUCTION_CALL") {
      if (!record.auctionCallId) {
        throw new Error(
          `Command "${record.commandId}" is missing its auction call target`
        );
      }

      const parsedResult =
        realtimeOperationalAuctionCallSchema
          .safeParse(payload);

      if (!parsedResult.success) {
        throw new Error(
          `Command "${record.commandId}" has an invalid auction call result`
        );
      }

      if (
        record.commandType !== "CREATE" &&
        record.commandType !== "OPEN" &&
        record.commandType !== "BID" &&
        record.commandType !== "PASS" &&
        record.commandType !== "UNDO_PASS" &&
        record.commandType !== "CONFIRM" &&
        record.commandType !== "CANCEL"
      ) {
        throw new Error(
          `Command "${record.commandId}" has an invalid auction call command type`
        );
      }

      return {
        id: record.id,
        auctionSessionId:
          record.auctionSessionId,
        commandScope:
          "AUCTION_CALL",
        auctionCallId:
          record.auctionCallId,
        commandId:
          record.commandId,
        commandType:
          record.commandType,
        expectedStateVersion:
          record.expectedStateVersion,
        resultStateVersion:
          record.resultStateVersion,
        requestFingerprint:
          record.requestFingerprint,
        result:
          parsedResult.data,
        createdAt:
          record.createdAt
      };
    }

    if (record.commandScope === "AUCTION_SESSION") {
      if (record.auctionCallId !== null) {
        throw new Error(
          `Command "${record.commandId}" has an invalid auction call target`
        );
      }

      if (
        record.commandType === "START_SESSION" ||
        record.commandType === "SUSPEND_SESSION" ||
        record.commandType === "RESUME_SESSION" ||
        record.commandType === "REOPEN_SESSION"
      ) {
        const parsedResult =
          auctionSessionSchema.safeParse(payload);

        if (!parsedResult.success) {
          throw new Error(
            `Command "${record.commandId}" has an invalid auction session result`
          );
        }

        return {
          id: record.id,
          auctionSessionId:
            record.auctionSessionId,
          commandScope:
            "AUCTION_SESSION",
          auctionCallId:
            null,
          commandId:
            record.commandId,
          commandType:
            record.commandType,
          expectedStateVersion:
            record.expectedStateVersion,
          resultStateVersion:
            record.resultStateVersion,
          requestFingerprint:
            record.requestFingerprint,
          result:
            parsedResult.data,
          createdAt:
            record.createdAt
        };
      }

      if (
        record.commandType ===
          "ADD_MANUAL_INITIAL_ROSTER_ENTRY" ||
        record.commandType ===
          "ADD_MANUAL_ROSTER_ASSIGNMENT"
      ) {
        const parsedResult =
          rosterEntrySchema.safeParse(payload);

        if (!parsedResult.success) {
          throw new Error(
            `Command "${record.commandId}" has an invalid manual roster result`
          );
        }

        return {
          id: record.id,
          auctionSessionId:
            record.auctionSessionId,
          commandScope:
            "AUCTION_SESSION",
          auctionCallId:
            null,
          commandId:
            record.commandId,
          commandType:
            record.commandType,
          expectedStateVersion:
            record.expectedStateVersion,
          resultStateVersion:
            record.resultStateVersion,
          requestFingerprint:
            record.requestFingerprint,
          result:
            parsedResult.data,
          createdAt:
            record.createdAt
        };
      }

      if (
        record.commandType ===
          "TECHNICAL_ROSTER_CORRECTION"
      ) {
        const parsedResult =
          parseTechnicalRosterCorrectionResult(
            payload
          );

        if (!parsedResult) {
          throw new Error(
            `Command "${record.commandId}" has an invalid technical roster correction result`
          );
        }

        return {
          id: record.id,
          auctionSessionId:
            record.auctionSessionId,
          commandScope:
            "AUCTION_SESSION",
          auctionCallId: null,
          commandId:
            record.commandId,
          commandType:
            record.commandType,
          expectedStateVersion:
            record.expectedStateVersion,
          resultStateVersion:
            record.resultStateVersion,
          requestFingerprint:
            record.requestFingerprint,
          result:
            parsedResult,
          createdAt:
            record.createdAt
        };
      }

      if (
        record.commandType ===
          "REMOVE_ROSTER_ASSIGNMENT"
      ) {
        const parsedResult =
          parseRosterAssignmentRemovalResult(
            payload
          );

        if (!parsedResult) {
          throw new Error(
            `Command "${record.commandId}" has an invalid roster assignment removal result`
          );
        }

        return {
          id: record.id,
          auctionSessionId:
            record.auctionSessionId,
          commandScope:
            "AUCTION_SESSION",
          auctionCallId: null,
          commandId:
            record.commandId,
          commandType:
            record.commandType,
          expectedStateVersion:
            record.expectedStateVersion,
          resultStateVersion:
            record.resultStateVersion,
          requestFingerprint:
            record.requestFingerprint,
          result:
            parsedResult,
          createdAt:
            record.createdAt
        };
      }

      throw new Error(
        `Command "${record.commandId}" has an invalid auction session command type`
      );
    }

    throw new Error(
      `Command "${record.commandId}" has an invalid command scope`
    );
  }
}
