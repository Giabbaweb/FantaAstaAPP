import {
  and,
  eq,
  sql
} from "drizzle-orm";

import {
  db
} from "../db/client.js";
import {
  auctionSessions
} from "../db/schema/index.js";

export type AuctionSessionState = {
  auctionSessionId: string;
  stateVersion: number;
};

export interface AuctionSessionStateRepository {
  findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionSessionState | null>;

  getCurrentStateVersion(
    auctionSessionId: string
  ): Promise<number | null>;

  incrementStateVersionIfMatches(
    auctionSessionId: string,
    expectedStateVersion: number
  ): Promise<number | null>;
}

export class SqliteAuctionSessionStateRepository
  implements AuctionSessionStateRepository
{
  async findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionSessionState | null> {
    const [state] = await db
      .select({
        auctionSessionId:
          auctionSessions.id,
        stateVersion:
          auctionSessions.stateVersion
      })
      .from(auctionSessions)
      .where(
        eq(
          auctionSessions.id,
          auctionSessionId
        )
      )
      .limit(1);

    return state ?? null;
  }

  async getCurrentStateVersion(
    auctionSessionId: string
  ): Promise<number | null> {
    const [row] = await db
      .select({
        stateVersion:
          auctionSessions.stateVersion
      })
      .from(auctionSessions)
      .where(
        eq(
          auctionSessions.id,
          auctionSessionId
        )
      )
      .limit(1);

    return row?.stateVersion ?? null;
  }

  async incrementStateVersionIfMatches(
    auctionSessionId: string,
    expectedStateVersion: number
  ): Promise<number | null> {
    const [updatedState] = await db
      .update(auctionSessions)
      .set({
        stateVersion:
          sql`${auctionSessions.stateVersion} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(
        and(
          eq(
            auctionSessions.id,
            auctionSessionId
          ),
          eq(
            auctionSessions.stateVersion,
            expectedStateVersion
          )
        )
      )
      .returning({
        stateVersion:
          auctionSessions.stateVersion
      });

    return updatedState?.stateVersion ?? null;
  }
}
