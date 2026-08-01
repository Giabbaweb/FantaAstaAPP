import { randomUUID } from "node:crypto";

import type {
  AuctionCall,
  AuctionCallTeam
} from "@fantaastaapp/domain";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql
} from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionCalls,
  auctionCallTeams,
  auctionSessionTeams
} from "../db/schema/index.js";

export type AuctionCallAggregate = {
  call: AuctionCall;
  teams: AuctionCallTeam[];
};

export interface AuctionCallReader {
  findById(
    id: string
  ): Promise<AuctionCallAggregate | null>;

  findOperationalByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionCallAggregate | null>;
}

export interface AuctionCallRepository
  extends AuctionCallReader {
  save(
    aggregate: AuctionCallAggregate
  ): Promise<AuctionCallAggregate>;

  delete(id: string): Promise<boolean>;
}

const operationalStatuses = [
  "DRAFT",
  "OPEN",
  "PROVISIONAL_AWARD",
  "SUSPENDED"
] as const;

export class SqliteAuctionCallRepository
  implements AuctionCallRepository
{
  async findById(
    id: string
  ): Promise<AuctionCallAggregate | null> {
    const [call] = await db
      .select()
      .from(auctionCalls)
      .where(eq(auctionCalls.id, id))
      .limit(1);

    if (!call) {
      return null;
    }

    const teams = await this.findTeamsByAuctionCallId(
      call.id
    );

    return {
      call,
      teams
    };
  }

  async findOperationalByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionCallAggregate | null> {
    const [call] = await db
      .select()
      .from(auctionCalls)
      .where(
        and(
          eq(
            auctionCalls.auctionSessionId,
            auctionSessionId
          ),
          inArray(
            auctionCalls.status,
            operationalStatuses
          )
        )
      )
      .orderBy(
        desc(auctionCalls.createdAt),
        desc(auctionCalls.id)
      )
      .limit(1);

    if (!call) {
      return null;
    }

    const teams = await this.findTeamsByAuctionCallId(
      call.id
    );

    return {
      call,
      teams
    };
  }

  async save(
    aggregate: AuctionCallAggregate
  ): Promise<AuctionCallAggregate> {
    const auctionCallId = db.transaction((tx) => {
      const [existingCall] = tx
        .select({
          id: auctionCalls.id
        })
        .from(auctionCalls)
        .where(
          eq(
            auctionCalls.id,
            aggregate.call.id
          )
        )
        .limit(1)
        .all();

      if (existingCall) {
        tx.update(auctionCalls)
          .set({
            auctionSessionId:
              aggregate.call.auctionSessionId,
            playerId:
              aggregate.call.playerId,
            callerAuctionSessionTeamId:
              aggregate.call
                .callerAuctionSessionTeamId,
            status:
              aggregate.call.status,
            openingBid:
              aggregate.call.openingBid,
            currentBid:
              aggregate.call.currentBid,
            currentLeaderAuctionSessionTeamId:
              aggregate.call
                .currentLeaderAuctionSessionTeamId,
            currentTurnAuctionSessionTeamId:
              aggregate.call
                .currentTurnAuctionSessionTeamId,
            provisionalWinnerAuctionSessionTeamId:
              aggregate.call
                .provisionalWinnerAuctionSessionTeamId,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(
            eq(
              auctionCalls.id,
              aggregate.call.id
            )
          )
          .run();

        tx.delete(auctionCallTeams)
          .where(
            eq(
              auctionCallTeams.auctionCallId,
              aggregate.call.id
            )
          )
          .run();
      } else {
        tx.insert(auctionCalls)
          .values({
            id: aggregate.call.id,
            auctionSessionId:
              aggregate.call.auctionSessionId,
            playerId:
              aggregate.call.playerId,
            callerAuctionSessionTeamId:
              aggregate.call
                .callerAuctionSessionTeamId,
            status:
              aggregate.call.status,
            openingBid:
              aggregate.call.openingBid,
            currentBid:
              aggregate.call.currentBid,
            currentLeaderAuctionSessionTeamId:
              aggregate.call
                .currentLeaderAuctionSessionTeamId,
            currentTurnAuctionSessionTeamId:
              aggregate.call
                .currentTurnAuctionSessionTeamId,
            provisionalWinnerAuctionSessionTeamId:
              aggregate.call
                .provisionalWinnerAuctionSessionTeamId,
            createdAt:
              aggregate.call.createdAt,
            updatedAt:
              aggregate.call.updatedAt
          })
          .run();
      }

      for (const team of aggregate.teams) {
        tx.insert(auctionCallTeams)
          .values({
            id: randomUUID(),
            auctionCallId:
              aggregate.call.id,
            auctionSessionTeamId:
              team.auctionSessionTeamId,
            status:
              team.status,
            maximumBid:
              team.maximumBid,
            exclusionReason:
              team.exclusionReason
          })
          .run();
      }

      return aggregate.call.id;
    });

    const savedAggregate = await this.findById(
      auctionCallId
    );

    if (!savedAggregate) {
      throw new Error(
        `Failed to save auction call "${auctionCallId}"`
      );
    }

    return savedAggregate;
  }

  async delete(id: string): Promise<boolean> {
    const deletedCalls = await db
      .delete(auctionCalls)
      .where(eq(auctionCalls.id, id))
      .returning({
        id: auctionCalls.id
      });

    return deletedCalls.length > 0;
  }

  private async findTeamsByAuctionCallId(
    auctionCallId: string
  ): Promise<AuctionCallTeam[]> {
    return db
      .select({
        auctionCallId:
          auctionCallTeams.auctionCallId,
        auctionSessionTeamId:
          auctionCallTeams.auctionSessionTeamId,
        turnOrder:
          auctionSessionTeams.tableOrder,
        status:
          auctionCallTeams.status,
        maximumBid:
          auctionCallTeams.maximumBid,
        exclusionReason:
          auctionCallTeams.exclusionReason
      })
      .from(auctionCallTeams)
      .innerJoin(
        auctionSessionTeams,
        eq(
          auctionCallTeams.auctionSessionTeamId,
          auctionSessionTeams.id
        )
      )
      .where(
        eq(
          auctionCallTeams.auctionCallId,
          auctionCallId
        )
      )
      .orderBy(
        asc(auctionSessionTeams.tableOrder),
        asc(
          auctionCallTeams.auctionSessionTeamId
        )
      );
  }
}
