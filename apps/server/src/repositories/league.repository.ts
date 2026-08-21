import { randomUUID } from "node:crypto";

import type {
  League
} from "@fantaastaapp/contracts";
import {
  asc,
  eq,
  sql
} from "drizzle-orm";

import {
  db
} from "../db/client.js";
import {
  leagues
} from "../db/schema/index.js";

export type CreateLeaguePersistenceInput = {
  name: string;
  normalizedName: string;
  logoPath?: string | null;
};

export type UpdateLeaguePersistenceInput = {
  name?: string;
  normalizedName?: string;
  logoPath?: string | null;
};

export interface LeagueRepository {
  findAll(): Promise<League[]>;

  findById(
    id: string
  ): Promise<League | null>;

  findByNormalizedName(
    normalizedName: string
  ): Promise<League | null>;

  create(
    input: CreateLeaguePersistenceInput
  ): Promise<League>;

  update(
    id: string,
    input: UpdateLeaguePersistenceInput
  ): Promise<League | null>;
}

export class SqliteLeagueRepository
  implements LeagueRepository
{
  async findAll(): Promise<League[]> {
    return db
      .select({
        id: leagues.id,
        name: leagues.name,
        logoPath: leagues.logoPath,
        createdAt: leagues.createdAt,
        updatedAt: leagues.updatedAt
      })
      .from(leagues)
      .orderBy(
        asc(leagues.name),
        asc(leagues.id)
      );
  }

  async findById(
    id: string
  ): Promise<League | null> {
    const [league] = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        logoPath: leagues.logoPath,
        createdAt: leagues.createdAt,
        updatedAt: leagues.updatedAt
      })
      .from(leagues)
      .where(
        eq(leagues.id, id)
      )
      .limit(1);

    return league ?? null;
  }

  async findByNormalizedName(
    normalizedName: string
  ): Promise<League | null> {
    const [league] = await db
      .select({
        id: leagues.id,
        name: leagues.name,
        logoPath: leagues.logoPath,
        createdAt: leagues.createdAt,
        updatedAt: leagues.updatedAt
      })
      .from(leagues)
      .where(
        eq(
          leagues.normalizedName,
          normalizedName
        )
      )
      .limit(1);

    return league ?? null;
  }

  async create(
    input: CreateLeaguePersistenceInput
  ): Promise<League> {
    const [league] = await db
      .insert(leagues)
      .values({
        id: randomUUID(),
        name: input.name,
        normalizedName:
          input.normalizedName,
        logoPath:
          input.logoPath ?? null
      })
      .returning({
        id: leagues.id,
        name: leagues.name,
        logoPath: leagues.logoPath,
        createdAt: leagues.createdAt,
        updatedAt: leagues.updatedAt
      });

    if (!league) {
      throw new Error(
        "Failed to create league"
      );
    }

    return league;
  }

  async update(
    id: string,
    input: UpdateLeaguePersistenceInput
  ): Promise<League | null> {
    const [league] = await db
      .update(leagues)
      .set({
        ...input,
        updatedAt:
          sql`CURRENT_TIMESTAMP`
      })
      .where(
        eq(leagues.id, id)
      )
      .returning({
        id: leagues.id,
        name: leagues.name,
        logoPath: leagues.logoPath,
        createdAt: leagues.createdAt,
        updatedAt: leagues.updatedAt
      });

    return league ?? null;
  }
}
