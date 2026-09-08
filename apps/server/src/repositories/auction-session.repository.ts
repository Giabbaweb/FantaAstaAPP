import { randomUUID } from "node:crypto";

import type {
  AuctionSession,
  AuctionSessionStatus,
  CreateAuctionSessionInput,
  UpdateAuctionSessionInput
} from "@fantaastaapp/contracts";
import { desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import { auctionSessions } from "../db/schema/index.js";

const auctionSessionPublicSelection = {
  id: auctionSessions.id,
  leagueId: auctionSessions.leagueId,
  season: auctionSessions.season,
  editionNumber: auctionSessions.editionNumber,
  status: auctionSessions.status,
  suspensionReason: auctionSessions.suspensionReason,
  initialCredits: auctionSessions.initialCredits,
  maximumInitialRosterEntries:
    auctionSessions.maximumInitialRosterEntries,
  remoteBaseUrl:
    auctionSessions.remoteBaseUrl,
  createdAt: auctionSessions.createdAt,
  updatedAt: auctionSessions.updatedAt
};

const activeStatuses = [
  "READY",
  "RUNNING",
  "SUSPENDED"
] as const;

export interface AuctionSessionRepository {
  findAll(): Promise<AuctionSession[]>;

  findById(id: string): Promise<AuctionSession | null>;

  findByIdWithExecutor(
    executor: DatabaseWriteExecutor,
    id: string
  ): AuctionSession | null;

  findActive(): Promise<AuctionSession | null>;

  create(
    input: CreateAuctionSessionInput
  ): Promise<AuctionSession>;

  update(
    id: string,
    input: UpdateAuctionSessionInput
  ): Promise<AuctionSession | null>;

  updateStatus(
    id: string,
    status: AuctionSessionStatus
  ): Promise<AuctionSession | null>;

  delete(id: string): Promise<boolean>;
}

export class SqliteAuctionSessionRepository
  implements AuctionSessionRepository
{
  async findAll(): Promise<AuctionSession[]> {
    return db
      .select(auctionSessionPublicSelection)
      .from(auctionSessions)
      .orderBy(desc(auctionSessions.createdAt));
  }

  async findById(id: string): Promise<AuctionSession | null> {
    return this.findByIdWithExecutor(
      db,
      id
    );
  }

  findByIdWithExecutor(
    executor: DatabaseWriteExecutor,
    id: string
  ): AuctionSession | null {
    const [session] = executor
      .select(auctionSessionPublicSelection)
      .from(auctionSessions)
      .where(eq(auctionSessions.id, id))
      .limit(1)
      .all();

    return session ?? null;
  }

  async findActive(): Promise<AuctionSession | null> {
    const [session] = await db
      .select(auctionSessionPublicSelection)
      .from(auctionSessions)
      .where(
        inArray(
          auctionSessions.status,
          activeStatuses
        )
      )
      .limit(1);

    return session ?? null;
  }

  async create(
    input: CreateAuctionSessionInput
  ): Promise<AuctionSession> {
    const [session] = await db
      .insert(auctionSessions)
      .values({
        id: randomUUID(),
        leagueId: input.leagueId,
        season: input.season,
        editionNumber: input.editionNumber,
        initialCredits: input.initialCredits,
        maximumInitialRosterEntries:
          input.maximumInitialRosterEntries
      })
      .returning(
        auctionSessionPublicSelection
      );

    if (!session) {
      throw new Error("Failed to create auction session");
    }

    return session;
  }

  async update(
    id: string,
    input: UpdateAuctionSessionInput
  ): Promise<AuctionSession | null> {
    const [session] = await db
      .update(auctionSessions)
      .set({
        ...input,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(auctionSessions.id, id))
      .returning(
        auctionSessionPublicSelection
      );

    return session ?? null;
  }

  async updateStatus(
    id: string,
    status: AuctionSessionStatus
  ): Promise<AuctionSession | null> {
    const [session] = await db
      .update(auctionSessions)
      .set({
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(auctionSessions.id, id))
      .returning(
        auctionSessionPublicSelection
      );

    return session ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedSessions = await db
      .delete(auctionSessions)
      .where(eq(auctionSessions.id, id))
      .returning({
        id: auctionSessions.id
      });

    return deletedSessions.length > 0;
  }
}
