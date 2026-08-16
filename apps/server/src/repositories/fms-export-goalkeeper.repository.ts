import { randomUUID } from "node:crypto";

import {
  eq,
  sql
} from "drizzle-orm";

import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
  fmsExportGoalkeepers
} from "../db/schema/index.js";

export type FmsExportGoalkeeperWriteExecutor =
  DatabaseWriteExecutor;

export type FmsExportGoalkeeperPersistenceRecord = {
  id: string;
  auctionSessionTeamId: string;
  playerId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateFmsExportGoalkeeperPersistenceInput = {
  auctionSessionTeamId: string;
  playerId: string;
};

export type UpdateFmsExportGoalkeeperPersistenceInput = {
  playerId: string;
};

export interface FmsExportGoalkeeperRepository {
  findByAuctionSessionTeamIdWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    auctionSessionTeamId: string
  ): FmsExportGoalkeeperPersistenceRecord | null;

  findByPlayerIdWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    playerId: string
  ): FmsExportGoalkeeperPersistenceRecord | null;

  createWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    input: CreateFmsExportGoalkeeperPersistenceInput
  ): FmsExportGoalkeeperPersistenceRecord;

  updateWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    id: string,
    input: UpdateFmsExportGoalkeeperPersistenceInput
  ): FmsExportGoalkeeperPersistenceRecord | null;
}

export class SqliteFmsExportGoalkeeperRepository
  implements FmsExportGoalkeeperRepository
{
  findByAuctionSessionTeamIdWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    auctionSessionTeamId: string
  ): FmsExportGoalkeeperPersistenceRecord | null {
    const [record] = executor
      .select()
      .from(fmsExportGoalkeepers)
      .where(
        eq(
          fmsExportGoalkeepers.auctionSessionTeamId,
          auctionSessionTeamId
        )
      )
      .limit(1)
      .all();

    return record ?? null;
  }

  findByPlayerIdWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    playerId: string
  ): FmsExportGoalkeeperPersistenceRecord | null {
    const [record] = executor
      .select()
      .from(fmsExportGoalkeepers)
      .where(
        eq(
          fmsExportGoalkeepers.playerId,
          playerId
        )
      )
      .limit(1)
      .all();

    return record ?? null;
  }

  createWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    input: CreateFmsExportGoalkeeperPersistenceInput
  ): FmsExportGoalkeeperPersistenceRecord {
    const [record] = executor
      .insert(fmsExportGoalkeepers)
      .values({
        id: randomUUID(),
        ...input
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        "Failed to create FMS export goalkeeper selection"
      );
    }

    return record;
  }

  updateWithExecutor(
    executor: FmsExportGoalkeeperWriteExecutor,
    id: string,
    input: UpdateFmsExportGoalkeeperPersistenceInput
  ): FmsExportGoalkeeperPersistenceRecord | null {
    const [record] = executor
      .update(fmsExportGoalkeepers)
      .set({
        ...input,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(
        eq(
          fmsExportGoalkeepers.id,
          id
        )
      )
      .returning()
      .all();

    return record ?? null;
  }
}
