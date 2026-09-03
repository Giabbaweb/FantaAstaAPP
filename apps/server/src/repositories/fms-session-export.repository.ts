import {
  eq,
  sql
} from "drizzle-orm";

import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
  fmsSessionExports
} from "../db/schema/index.js";

export type FmsSessionExportWriteExecutor =
  DatabaseWriteExecutor;

export type FmsSessionExportPersistenceRecord = {
  auctionSessionId: string;
  exportedAt: string;
};

export interface FmsSessionExportRepository {
  findByAuctionSessionIdWithExecutor(
    executor: FmsSessionExportWriteExecutor,
    auctionSessionId: string
  ): FmsSessionExportPersistenceRecord | null;

  upsertWithExecutor(
    executor: FmsSessionExportWriteExecutor,
    auctionSessionId: string
  ): FmsSessionExportPersistenceRecord;

  deleteByAuctionSessionIdWithExecutor(
    executor: FmsSessionExportWriteExecutor,
    auctionSessionId: string
  ): void;
}

export class SqliteFmsSessionExportRepository
  implements FmsSessionExportRepository
{
  findByAuctionSessionIdWithExecutor(
    executor: FmsSessionExportWriteExecutor,
    auctionSessionId: string
  ): FmsSessionExportPersistenceRecord | null {
    const [record] = executor
      .select()
      .from(fmsSessionExports)
      .where(
        eq(
          fmsSessionExports.auctionSessionId,
          auctionSessionId
        )
      )
      .limit(1)
      .all();

    return record ?? null;
  }

  upsertWithExecutor(
    executor: FmsSessionExportWriteExecutor,
    auctionSessionId: string
  ): FmsSessionExportPersistenceRecord {
    const [record] = executor
      .insert(fmsSessionExports)
      .values({
        auctionSessionId
      })
      .onConflictDoUpdate({
        target:
          fmsSessionExports.auctionSessionId,
        set: {
          exportedAt:
            sql`CURRENT_TIMESTAMP`
        }
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        "Failed to persist FMS session export"
      );
    }

    return record;
  }

  deleteByAuctionSessionIdWithExecutor(
    executor: FmsSessionExportWriteExecutor,
    auctionSessionId: string
  ): void {
    executor
      .delete(fmsSessionExports)
      .where(
        eq(
          fmsSessionExports.auctionSessionId,
          auctionSessionId
        )
      )
      .run();
  }
}
