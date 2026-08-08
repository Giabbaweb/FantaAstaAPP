import { randomUUID } from "node:crypto";

import {
  assertContractYearAllowed
} from "@fantaastaapp/domain";
import type {
  ContractYear,
  RosterEntry,
  RosterEntrySource
} from "@fantaastaapp/domain";
import { asc, eq } from "drizzle-orm";

import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
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
}

export class SqliteRosterEntryRepository
  implements RosterEntryRepository
{
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
}
