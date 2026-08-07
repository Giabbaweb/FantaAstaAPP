import { randomUUID } from "node:crypto";

import type {
  AuctionSessionTeam,
  CreateAuctionSessionTeamInput,
  UpdateAuctionSessionTeamInput
} from "@fantaastaapp/contracts";
import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import type { DatabaseWriteExecutor } from "../db/client.js";
import {
  auctionSessionTeams
} from "../db/schema/index.js";

const auctionSessionTeamPublicSelection = {
  auctionSessionId:
    auctionSessionTeams.auctionSessionId,
  teamId: auctionSessionTeams.teamId,
  tableOrder: auctionSessionTeams.tableOrder,
  renewalCredits:
    auctionSessionTeams.renewalCredits,
  remainingCredits:
    auctionSessionTeams.remainingCredits
};

const auctionSessionTeamPersistenceSelection = {
  id: auctionSessionTeams.id,
  ...auctionSessionTeamPublicSelection
};

export type AuctionSessionTeamWriteExecutor =
  DatabaseWriteExecutor;

export type AuctionSessionTeamPersistenceRecord =
  AuctionSessionTeam & {
    id: string;
  };

export interface AuctionSessionTeamTransactionalRepository {
  findByIdWithExecutor(
    executor: AuctionSessionTeamWriteExecutor,
    id: string
  ): AuctionSessionTeamPersistenceRecord | null;

  updateRemainingCreditsWithExecutor(
    executor: AuctionSessionTeamWriteExecutor,
    id: string,
    remainingCredits: number
  ): AuctionSessionTeamPersistenceRecord | null;
}

export interface AuctionSessionTeamRepository {
  findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionSessionTeam[]>;

  findOne(
    auctionSessionId: string,
    teamId: string
  ): Promise<AuctionSessionTeam | null>;

  create(
    auctionSessionId: string,
    input: CreateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam>;

  update(
    auctionSessionId: string,
    teamId: string,
    input: UpdateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam | null>;

  delete(
    auctionSessionId: string,
    teamId: string
  ): Promise<boolean>;
}

export class SqliteAuctionSessionTeamRepository
    implements
      AuctionSessionTeamRepository,
      AuctionSessionTeamTransactionalRepository
{
  async findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionSessionTeam[]> {
    return db
      .select(auctionSessionTeamPublicSelection)
      .from(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.auctionSessionId,
          auctionSessionId
        )
      )
      .orderBy(
        asc(auctionSessionTeams.tableOrder),
        asc(auctionSessionTeams.teamId)
      );
  }

  async findOne(
    auctionSessionId: string,
    teamId: string
  ): Promise<AuctionSessionTeam | null> {
    const [auctionSessionTeam] = await db
      .select(auctionSessionTeamPublicSelection)
      .from(auctionSessionTeams)
      .where(
        and(
          eq(
            auctionSessionTeams.auctionSessionId,
            auctionSessionId
          ),
          eq(auctionSessionTeams.teamId, teamId)
        )
      )
      .limit(1);

    return auctionSessionTeam ?? null;
  }

  async create(
    auctionSessionId: string,
    input: CreateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam> {
    const [auctionSessionTeam] = await db
      .insert(auctionSessionTeams)
      .values({
        id: randomUUID(),
        auctionSessionId,
        teamId: input.teamId,
        tableOrder: input.tableOrder,
        renewalCredits: input.renewalCredits,
        remainingCredits: input.remainingCredits
      })
      .returning(
        auctionSessionTeamPublicSelection
      );

    if (!auctionSessionTeam) {
      throw new Error(
        "Failed to create auction session team"
      );
    }

    return auctionSessionTeam;
  }

  async update(
    auctionSessionId: string,
    teamId: string,
    input: UpdateAuctionSessionTeamInput
  ): Promise<AuctionSessionTeam | null> {
    const [auctionSessionTeam] = await db
      .update(auctionSessionTeams)
      .set(input)
      .where(
        and(
          eq(
            auctionSessionTeams.auctionSessionId,
            auctionSessionId
          ),
          eq(auctionSessionTeams.teamId, teamId)
        )
      )
      .returning(
        auctionSessionTeamPublicSelection
      );

    return auctionSessionTeam ?? null;
  }

  findByIdWithExecutor(
    executor: AuctionSessionTeamWriteExecutor,
    id: string
  ): AuctionSessionTeamPersistenceRecord | null {
    const [auctionSessionTeam] = executor
      .select(
        auctionSessionTeamPersistenceSelection
      )
      .from(auctionSessionTeams)
      .where(eq(auctionSessionTeams.id, id))
      .limit(1)
      .all();

    return auctionSessionTeam ?? null;
  }

  updateRemainingCreditsWithExecutor(
    executor: AuctionSessionTeamWriteExecutor,
    id: string,
    remainingCredits: number
  ): AuctionSessionTeamPersistenceRecord | null {
    const [auctionSessionTeam] = executor
      .update(auctionSessionTeams)
      .set({
        remainingCredits
      })
      .where(eq(auctionSessionTeams.id, id))
      .returning(
        auctionSessionTeamPersistenceSelection
      )
      .all();

    return auctionSessionTeam ?? null;
  }

  async delete(
    auctionSessionId: string,
    teamId: string
  ): Promise<boolean> {
    const deletedAuctionSessionTeams = await db
      .delete(auctionSessionTeams)
      .where(
        and(
          eq(
            auctionSessionTeams.auctionSessionId,
            auctionSessionId
          ),
          eq(auctionSessionTeams.teamId, teamId)
        )
      )
      .returning({
        auctionSessionId:
          auctionSessionTeams.auctionSessionId,
        teamId: auctionSessionTeams.teamId
      });

    return deletedAuctionSessionTeams.length > 0;
  }
}
