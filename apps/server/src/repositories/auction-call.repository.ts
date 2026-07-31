import type {
  AuctionCall,
  AuctionCallTeam
} from "@fantaastaapp/domain";
import {
  and,
  asc,
  desc,
  eq,
  inArray
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

const operationalStatuses = [
  "DRAFT",
  "OPEN",
  "PROVISIONAL_AWARD",
  "SUSPENDED"
] as const;

export class SqliteAuctionCallRepository
  implements AuctionCallReader
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
