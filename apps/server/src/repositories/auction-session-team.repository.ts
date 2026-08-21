import { randomUUID } from "node:crypto";

import type {
  AuctionSessionTeam,
  CreateAuctionSessionTeamInput,
  UpdateAuctionSessionTeamInput
} from "@fantaastaapp/contracts";
import { and, asc, eq } from "drizzle-orm";

import {
  db,
  sqlite
} from "../db/client.js";
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

  findByAuctionSessionIdWithExecutor(
    executor: AuctionSessionTeamWriteExecutor,
    auctionSessionId: string
  ): AuctionSessionTeamPersistenceRecord[];

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

  reorder(
    auctionSessionId: string,
    teamIds: string[]
  ): Promise<AuctionSessionTeam[]>;

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

  async reorder(
    auctionSessionId: string,
    teamIds: string[]
  ): Promise<AuctionSessionTeam[]> {
    const executeReorder =
      sqlite.transaction(() => {
        /*
         * table_order è UNIQUE per sessione.
         *
         * Uno scambio diretto 1 <-> 2 non è
         * possibile con l'indice attivo perché
         * SQLite verifica l'unicità durante
         * ciascun UPDATE.
         *
         * L'indice viene quindi rimosso e
         * ricreato all'interno della stessa
         * transaction. Gli ID persistenti delle
         * auction_session_teams non cambiano mai.
         */
        sqlite.exec(`
          DROP INDEX
          auction_session_teams_table_order_unique
        `);

        const update =
          sqlite.prepare(`
            UPDATE auction_session_teams
            SET table_order = ?
            WHERE auction_session_id = ?
              AND team_id = ?
          `);

        for (
          let index = 0;
          index < teamIds.length;
          index += 1
        ) {
          const teamId =
            teamIds[index];

          if (!teamId) {
            throw new Error(
              "Invalid team ID during table reorder"
            );
          }

          const result =
            update.run(
              index + 1,
              auctionSessionId,
              teamId
            );

          if (result.changes !== 1) {
            throw new Error(
              `Failed to reorder team "${teamId}" in auction session "${auctionSessionId}"`
            );
          }
        }

        sqlite.exec(`
          CREATE UNIQUE INDEX
          auction_session_teams_table_order_unique
          ON auction_session_teams (
            auction_session_id,
            table_order
          )
        `);
      });

    /*
     * IMMEDIATE acquisisce il write lock prima
     * di modificare temporaneamente l'indice.
     */
    executeReorder.immediate();

    return this.findByAuctionSessionId(
      auctionSessionId
    );
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

  findByAuctionSessionIdWithExecutor(
    executor: AuctionSessionTeamWriteExecutor,
    auctionSessionId: string
  ): AuctionSessionTeamPersistenceRecord[] {
    return executor
      .select(
        auctionSessionTeamPersistenceSelection
      )
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
      )
      .all();
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
