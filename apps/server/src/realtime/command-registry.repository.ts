import {
  randomUUID
} from "node:crypto";

import {
  and,
  eq
} from "drizzle-orm";

import {
  realtimeOperationalAuctionCallSchema
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

export type RegisteredAuctionCommand = {
  id: string;
  auctionSessionId: string;
  auctionCallId: string;
  commandId: string;
  commandType: RegisteredAuctionCommandType;
  expectedStateVersion: number;
  resultStateVersion: number;
  requestFingerprint: string;
  result: AuctionCallAggregate;
  createdAt: string;
};

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

export interface CommandRegistryRepository {
  findByCommandId(
    auctionSessionId: string,
    commandId: string
  ): Promise<RegisteredAuctionCommand | null>;

  create(
    input: RegisterAuctionCommandInput
  ): Promise<RegisteredAuctionCommand>;

  createWithExecutor(
    executor: DatabaseWriteExecutor,
    input: RegisterAuctionCommandInput
  ): RegisteredAuctionCommand;
}

export class SqliteCommandRegistryRepository
  implements CommandRegistryRepository
{
  async findByCommandId(
    auctionSessionId: string,
    commandId: string
  ): Promise<RegisteredAuctionCommand | null> {
    const [record] = await db
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
      .limit(1);

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

    return this.mapRecord(record);
  }

  private mapRecord(
    record: typeof commandRegistry.$inferSelect
  ): RegisteredAuctionCommand {
    let payload: unknown;

    try {
      payload =
        JSON.parse(record.resultPayload);
    } catch {
      throw new Error(
        `Command "${record.commandId}" has an invalid result payload`
      );
    }

    const parsedResult =
      realtimeOperationalAuctionCallSchema
        .safeParse(payload);

    if (!parsedResult.success) {
      throw new Error(
        `Command "${record.commandId}" has an invalid result aggregate`
      );
    }

    return {
      id: record.id,
      auctionSessionId:
        record.auctionSessionId,
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
}
