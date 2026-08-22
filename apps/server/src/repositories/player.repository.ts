import { randomUUID } from "node:crypto";

import type {
  Player,
  PlayerAvailabilityStatus,
  PlayerRole
} from "@fantaastaapp/contracts";
import {
  and,
  asc,
  eq,
  inArray,
  sql
} from "drizzle-orm";

import { db } from "../db/client.js";
import type { DatabaseWriteExecutor } from "../db/client.js";
import { players } from "../db/schema/index.js";

export type PlayerWriteExecutor = DatabaseWriteExecutor;

export type CreatePlayerPersistenceInput = {
  auctionSessionId: string;
  fmsCode: string;
  name: string;
  normalizedName: string;
  realTeamName?: string | null;
  role: PlayerRole;
  availabilityStatus: PlayerAvailabilityStatus;
};

export type UpdatePlayerPersistenceInput = {
  fmsCode?: string;
  name?: string;
  normalizedName?: string;
  realTeamName?: string | null;
  role?: PlayerRole;
  availabilityStatus?: PlayerAvailabilityStatus;
};

export interface PlayerRepository {
  findAllByAuctionSessionId(
    auctionSessionId: string
  ): Promise<Player[]>;

  findById(id: string): Promise<Player | null>;

  findByIdWithExecutor(
    executor: PlayerWriteExecutor,
    id: string
  ): Player | null;

  findByIdsWithExecutor(
    executor: PlayerWriteExecutor,
    ids: string[]
  ): Player[];

  findByFmsCode(
    auctionSessionId: string,
    fmsCode: string
  ): Promise<Player | null>;

  findByNormalizedName(
    auctionSessionId: string,
    normalizedName: string
  ): Promise<Player | null>;

  create(
    input: CreatePlayerPersistenceInput
  ): Promise<Player>;

  createWithExecutor(
    executor: PlayerWriteExecutor,
    input: CreatePlayerPersistenceInput
  ): Player;

  update(
    id: string,
    input: UpdatePlayerPersistenceInput
  ): Promise<Player | null>;

  updateAvailabilityStatusWithExecutor(
    executor: PlayerWriteExecutor,
    id: string,
    availabilityStatus: PlayerAvailabilityStatus
  ): Player | null;

  delete(id: string): Promise<boolean>;

  deleteByAuctionSessionIdWithExecutor(
    executor: PlayerWriteExecutor,
    auctionSessionId: string
  ): number;
}

export class SqlitePlayerRepository
  implements PlayerRepository
{
  async findAllByAuctionSessionId(
    auctionSessionId: string
  ): Promise<Player[]> {
    return db
      .select()
      .from(players)
      .where(
        eq(
          players.auctionSessionId,
          auctionSessionId
        )
      )
      .orderBy(
        asc(players.name),
        asc(players.id)
      );
  }

  async findById(
    id: string
  ): Promise<Player | null> {
    return this.findByIdWithExecutor(
      db,
      id
    );
  }

  findByIdWithExecutor(
    executor: PlayerWriteExecutor,
    id: string
  ): Player | null {
    const [player] = executor
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1)
      .all();

    return player ?? null;
  }

  findByIdsWithExecutor(
    executor: PlayerWriteExecutor,
    ids: string[]
  ): Player[] {
    if (ids.length === 0) {
      return [];
    }

    return executor
      .select()
      .from(players)
      .where(inArray(players.id, ids))
      .orderBy(
        asc(players.name),
        asc(players.id)
      )
      .all();
  }

  async findByFmsCode(
    auctionSessionId: string,
    fmsCode: string
  ): Promise<Player | null> {
    const [player] = await db
      .select()
      .from(players)
      .where(
        and(
          eq(
            players.auctionSessionId,
            auctionSessionId
          ),
          eq(players.fmsCode, fmsCode)
        )
      )
      .limit(1);

    return player ?? null;
  }

  async findByNormalizedName(
    auctionSessionId: string,
    normalizedName: string
  ): Promise<Player | null> {
    const [player] = await db
      .select()
      .from(players)
      .where(
        and(
          eq(
            players.auctionSessionId,
            auctionSessionId
          ),
          eq(
            players.normalizedName,
            normalizedName
          )
        )
      )
      .limit(1);

    return player ?? null;
  }

  async create(
    input: CreatePlayerPersistenceInput
  ): Promise<Player> {
    return this.createWithExecutor(
      db,
      input
    );
  }

  createWithExecutor(
    executor: PlayerWriteExecutor,
    input: CreatePlayerPersistenceInput
  ): Player {
    const [player] = executor
      .insert(players)
      .values({
        id: randomUUID(),
        ...input
      })
      .returning()
      .all();

    if (!player) {
      throw new Error("Failed to create player");
    }

    return player;
  }

  async update(
    id: string,
    input: UpdatePlayerPersistenceInput
  ): Promise<Player | null> {
    const [player] = await db
      .update(players)
      .set({
        ...input,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(players.id, id))
      .returning();

    return player ?? null;
  }

  updateAvailabilityStatusWithExecutor(
    executor: PlayerWriteExecutor,
    id: string,
    availabilityStatus: PlayerAvailabilityStatus
  ): Player | null {
    const [player] = executor
      .update(players)
      .set({
        availabilityStatus,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(players.id, id))
      .returning()
      .all();

    return player ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedPlayers = await db
      .delete(players)
      .where(eq(players.id, id))
      .returning({
        id: players.id
      });

    return deletedPlayers.length > 0;
  }

  deleteByAuctionSessionIdWithExecutor(
    executor: PlayerWriteExecutor,
    auctionSessionId: string
  ): number {
    const result = executor
      .delete(players)
      .where(
        eq(
          players.auctionSessionId,
          auctionSessionId
        )
      )
      .run();

    return result.changes;
  }
}
