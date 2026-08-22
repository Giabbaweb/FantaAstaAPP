import { randomUUID } from "node:crypto";

import {
  assertContractYearAllowed
} from "@fantaastaapp/domain";
import type {
  ContractYear,
  RosterEntry,
  RosterEntrySource
} from "@fantaastaapp/domain";
import {
  asc,
  eq,
  inArray,
  sql
} from "drizzle-orm";

import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
  auctionSessionTeams,
  rosterEntries
} from "../db/schema/index.js";

export type RosterEntryWriteExecutor =
  DatabaseWriteExecutor;

export type CreateRosterEntryPersistenceInput = {
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: ContractYear;
  source: RosterEntrySource;
};

export type UpdateRosterEntryPersistenceInput = {
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: ContractYear;
  source: RosterEntrySource;
};

type RosterEntryPersistenceRecord = {
  id: string;
  auctionSessionTeamId: string;
  playerId: string;
  acquisitionCost: number;
  contractYear: number;
  source: RosterEntrySource;
  createdAt: string;
  updatedAt: string;
};

function toRosterEntry(
  record: RosterEntryPersistenceRecord
): RosterEntry {
  assertContractYearAllowed(
    record.contractYear
  );

  return {
    ...record,
    contractYear: record.contractYear
  };
}

export interface RosterEntryRepository {
  findByIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    id: string
  ): RosterEntry | null;

  findByAuctionSessionTeamIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    auctionSessionTeamId: string
  ): RosterEntry[];

  findByPlayerIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    playerId: string
  ): RosterEntry | null;

  createWithExecutor(
    executor: RosterEntryWriteExecutor,
    input: CreateRosterEntryPersistenceInput
  ): RosterEntry;

  updateWithExecutor(
    executor: RosterEntryWriteExecutor,
    id: string,
    input: UpdateRosterEntryPersistenceInput
  ): RosterEntry | null;

  deleteByAuctionSessionIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    auctionSessionId: string
  ): number;
}

export class SqliteRosterEntryRepository
  implements RosterEntryRepository
{
  findByIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    id: string
  ): RosterEntry | null {
    const [record] = executor
      .select()
      .from(rosterEntries)
      .where(eq(rosterEntries.id, id))
      .limit(1)
      .all();

    return record
      ? toRosterEntry(record)
      : null;
  }

  findByAuctionSessionTeamIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    auctionSessionTeamId: string
  ): RosterEntry[] {
    const records = executor
      .select()
      .from(rosterEntries)
      .where(
        eq(
          rosterEntries.auctionSessionTeamId,
          auctionSessionTeamId
        )
      )
      .orderBy(
        asc(rosterEntries.createdAt),
        asc(rosterEntries.id)
      )
      .all();

    return records.map(toRosterEntry);
  }

  findByPlayerIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    playerId: string
  ): RosterEntry | null {
    const [record] = executor
      .select()
      .from(rosterEntries)
      .where(eq(rosterEntries.playerId, playerId))
      .limit(1)
      .all();

    return record
      ? toRosterEntry(record)
      : null;
  }

  createWithExecutor(
    executor: RosterEntryWriteExecutor,
    input: CreateRosterEntryPersistenceInput
  ): RosterEntry {
    const [record] = executor
      .insert(rosterEntries)
      .values({
        id: randomUUID(),
        ...input
      })
      .returning()
      .all();

    if (!record) {
      throw new Error(
        "Failed to create roster entry"
      );
    }

    return toRosterEntry(record);
  }

  updateWithExecutor(
    executor: RosterEntryWriteExecutor,
    id: string,
    input: UpdateRosterEntryPersistenceInput
  ): RosterEntry | null {
    const [record] = executor
      .update(rosterEntries)
      .set({
        ...input,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(rosterEntries.id, id))
      .returning()
      .all();

    return record
      ? toRosterEntry(record)
      : null;
  }

  deleteByAuctionSessionIdWithExecutor(
    executor: RosterEntryWriteExecutor,
    auctionSessionId: string
  ): number {
    const sessionTeamIds = executor
      .select({
        id: auctionSessionTeams.id
      })
      .from(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.auctionSessionId,
          auctionSessionId
        )
      );

    const result = executor
      .delete(rosterEntries)
      .where(
        inArray(
          rosterEntries.auctionSessionTeamId,
          sessionTeamIds
        )
      )
      .run();

    return result.changes;
  }
}
