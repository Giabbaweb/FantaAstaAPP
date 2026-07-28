import { randomUUID } from "node:crypto";

import type {
  CreateTeamInput,
  Team,
  UpdateTeamInput
} from "@fantaastaapp/contracts";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { teams } from "../db/schema/index.js";

export interface TeamRepository {
  findAll(): Promise<Team[]>;

  findById(id: string): Promise<Team | null>;

  findByLeagueId(leagueId: string): Promise<Team[]>;

  create(input: CreateTeamInput): Promise<Team>;

  update(
    id: string,
    input: UpdateTeamInput
  ): Promise<Team | null>;

  delete(id: string): Promise<boolean>;
}

export class SqliteTeamRepository
  implements TeamRepository
{
  async findAll(): Promise<Team[]> {
    return db
      .select()
      .from(teams)
      .orderBy(
        asc(teams.name),
        asc(teams.id)
      );
  }

  async findById(id: string): Promise<Team | null> {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    return team ?? null;
  }

  async findByLeagueId(
    leagueId: string
  ): Promise<Team[]> {
    return db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, leagueId))
      .orderBy(
        asc(teams.name),
        asc(teams.id)
      );
  }

  async create(
    input: CreateTeamInput
  ): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values({
        id: randomUUID(),
        leagueId: input.leagueId,
        name: input.name,
        shortName: input.shortName,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        logoPath: input.logoPath
      })
      .returning();

    if (!team) {
      throw new Error("Failed to create team");
    }

    return team;
  }

  async update(
    id: string,
    input: UpdateTeamInput
  ): Promise<Team | null> {
    const [team] = await db
      .update(teams)
      .set({
        ...input,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(teams.id, id))
      .returning();

    return team ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedTeams = await db
      .delete(teams)
      .where(eq(teams.id, id))
      .returning({
        id: teams.id
      });

    return deletedTeams.length > 0;
  }
}
