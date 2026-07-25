import { randomUUID } from "node:crypto";

import type {
  AuctionSession,
  AuctionSessionStatus,
  CreateAuctionSessionInput,
  UpdateAuctionSessionInput
} from "@fantaastaapp/contracts";
import { desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { auctionSessions } from "../db/schema/index.js";

const activeStatuses = [
  "READY",
  "RUNNING",
  "SUSPENDED"
] as const;

export interface AuctionSessionRepository {
  findAll(): Promise<AuctionSession[]>;

  findById(id: string): Promise<AuctionSession | null>;

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
      .select()
      .from(auctionSessions)
      .orderBy(desc(auctionSessions.createdAt));
  }

  async findById(id: string): Promise<AuctionSession | null> {
    const [session] = await db
      .select()
      .from(auctionSessions)
      .where(eq(auctionSessions.id, id))
      .limit(1);

    return session ?? null;
  }

  async findActive(): Promise<AuctionSession | null> {
    const [session] = await db
      .select()
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
        initialCredits: input.initialCredits
      })
      .returning();

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
      .returning();

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
      .returning();

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
