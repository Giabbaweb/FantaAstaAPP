import {
  randomUUID
} from "node:crypto";

import {
  and,
  eq
} from "drizzle-orm";

import {
  auctionSessionSchema,
  realtimeOperationalAuctionCallSchema
} from "@fantaastaapp/contracts";
import type {
  AuctionSession
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
  | "OPEN"
  | "BID"
  | "PASS"
  | "UNDO_PASS"
  | "CONFIRM"
  | "CANCEL";

export type RegisteredAuctionSessionCommandType =
  | "SUSPEND_SESSION"
  | "RESUME_SESSION";

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

export type RegisteredCommand =
  | RegisteredAuctionCommand
  | RegisteredAuctionSessionCommand;

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

    if (mapped.commandScope !== "AUCTION_SESSION") {
      throw new Error(
        `Command "${input.commandId}" has an invalid command scope`
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

      const parsedResult =
        auctionSessionSchema.safeParse(payload);

      if (!parsedResult.success) {
        throw new Error(
          `Command "${record.commandId}" has an invalid auction session result`
        );
      }

      if (
        record.commandType !== "SUSPEND_SESSION" &&
        record.commandType !== "RESUME_SESSION"
      ) {
        throw new Error(
          `Command "${record.commandId}" has an invalid auction session command type`
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

    throw new Error(
      `Command "${record.commandId}" has an invalid command scope`
    );
  }
}
