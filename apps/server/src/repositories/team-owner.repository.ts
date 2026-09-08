import type {
  CreateTeamOwnerInput,
  TeamOwner,
  UpdateTeamOwnerInput
} from "@fantaastaapp/contracts";
import {
  and,
  asc,
  desc,
  eq
} from "drizzle-orm";

import { db } from "../db/client.js";
import {
  teamOwners
} from "../db/schema/index.js";

export interface TeamOwnerRepository {
  findByTeamId(
    teamId: string
  ): Promise<TeamOwner[]>;

  findByOwnerId(
    ownerId: string
  ): Promise<TeamOwner[]>;

  findByTeamAndOwner(
    teamId: string,
    ownerId: string
  ): Promise<TeamOwner | null>;

  create(
    teamId: string,
    input: CreateTeamOwnerInput
  ): Promise<TeamOwner>;

  update(
    teamId: string,
    ownerId: string,
    input: UpdateTeamOwnerInput
  ): Promise<TeamOwner | null>;

  delete(
    teamId: string,
    ownerId: string
  ): Promise<boolean>;
}

export class SqliteTeamOwnerRepository
  implements TeamOwnerRepository
{
  async findByTeamId(
    teamId: string
  ): Promise<TeamOwner[]> {
    return db
      .select()
      .from(teamOwners)
      .where(
        eq(teamOwners.teamId, teamId)
      )
      .orderBy(
        desc(teamOwners.isPrimary),
        asc(teamOwners.ownerId)
      );
  }

  async findByOwnerId(
    ownerId: string
  ): Promise<TeamOwner[]> {
    return db
      .select()
      .from(teamOwners)
      .where(
        eq(teamOwners.ownerId, ownerId)
      )
      .orderBy(
        asc(teamOwners.teamId)
      );
  }

  async findByTeamAndOwner(
    teamId: string,
    ownerId: string
  ): Promise<TeamOwner | null> {
    const [teamOwner] = await db
      .select()
      .from(teamOwners)
      .where(
        and(
          eq(
            teamOwners.teamId,
            teamId
          ),
          eq(
            teamOwners.ownerId,
            ownerId
          )
        )
      )
      .limit(1);

    return teamOwner ?? null;
  }

  async create(
    teamId: string,
    input: CreateTeamOwnerInput
  ): Promise<TeamOwner> {
    const [teamOwner] = await db
      .insert(teamOwners)
      .values({
        teamId,
        ownerId: input.ownerId,
        isPrimary: input.isPrimary
      })
      .returning();

    if (!teamOwner) {
      throw new Error(
        "Failed to create team owner"
      );
    }

    return teamOwner;
  }

  async update(
    teamId: string,
    ownerId: string,
    input: UpdateTeamOwnerInput
  ): Promise<TeamOwner | null> {
    const [teamOwner] = await db
      .update(teamOwners)
      .set({
        isPrimary: input.isPrimary
      })
      .where(
        and(
          eq(
            teamOwners.teamId,
            teamId
          ),
          eq(
            teamOwners.ownerId,
            ownerId
          )
        )
      )
      .returning();

    return teamOwner ?? null;
  }

  async delete(
    teamId: string,
    ownerId: string
  ): Promise<boolean> {
    const deletedTeamOwners =
      await db
        .delete(teamOwners)
        .where(
          and(
            eq(
              teamOwners.teamId,
              teamId
            ),
            eq(
              teamOwners.ownerId,
              ownerId
            )
          )
        )
        .returning({
          teamId:
            teamOwners.teamId
        });

    return (
      deletedTeamOwners.length > 0
    );
  }
}
