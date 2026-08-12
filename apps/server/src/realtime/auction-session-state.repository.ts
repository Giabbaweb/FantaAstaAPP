import {
  and,
  eq,
  sql
} from "drizzle-orm";

import {
  db
} from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
  auctionSessions
} from "../db/schema/index.js";

export type AuctionSessionState = {
  auctionSessionId: string;
  status:
    typeof auctionSessions.$inferSelect.status;
  suspensionReason:
    typeof auctionSessions.$inferSelect.suspensionReason;
  stateVersion: number;
};

export type AuctionSessionOperationalStateUpdate =
  | {
      status: "SUSPENDED";
      suspensionReason: NonNullable<
        typeof auctionSessions.$inferSelect.suspensionReason
      >;
    }
  | {
      status: "RUNNING";
      suspensionReason: null;
    };

export interface AuctionSessionStateRepository {
  findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionSessionState | null>;

  findByAuctionSessionIdWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string
  ): AuctionSessionState | null;

  getCurrentStateVersion(
    auctionSessionId: string
  ): Promise<number | null>;

  getCurrentStateVersionWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string
  ): number | null;

  incrementStateVersionIfMatches(
    auctionSessionId: string,
    expectedStateVersion: number
  ): Promise<number | null>;

  incrementStateVersionIfMatchesWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string,
    expectedStateVersion: number
  ): number | null;

  updateOperationalStateIfMatches(
    auctionSessionId: string,
    expectedStateVersion: number,
    update: AuctionSessionOperationalStateUpdate
  ): Promise<AuctionSessionState | null>;

  updateOperationalStateIfMatchesWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string,
    expectedStateVersion: number,
    update: AuctionSessionOperationalStateUpdate
  ): AuctionSessionState | null;
}

export class SqliteAuctionSessionStateRepository
  implements AuctionSessionStateRepository
{
  async findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionSessionState | null> {
    return this.findByAuctionSessionIdWithExecutor(
      db,
      auctionSessionId
    );
  }

  findByAuctionSessionIdWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string
  ): AuctionSessionState | null {
    const [state] = executor
      .select({
        auctionSessionId:
          auctionSessions.id,
        status:
          auctionSessions.status,
        suspensionReason:
          auctionSessions.suspensionReason,
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
      .limit(1)
      .all();

    return state ?? null;
  }

  async getCurrentStateVersion(
    auctionSessionId: string
  ): Promise<number | null> {
    return this
      .getCurrentStateVersionWithExecutor(
        db,
        auctionSessionId
      );
  }

  getCurrentStateVersionWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string
  ): number | null {
    const [row] = executor
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
      .limit(1)
      .all();

    return row?.stateVersion ?? null;
  }

  async incrementStateVersionIfMatches(
    auctionSessionId: string,
    expectedStateVersion: number
  ): Promise<number | null> {
    return this
      .incrementStateVersionIfMatchesWithExecutor(
        db,
        auctionSessionId,
        expectedStateVersion
      );
  }

  incrementStateVersionIfMatchesWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string,
    expectedStateVersion: number
  ): number | null {
    const [updatedState] = executor
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
      })
      .all();

    return updatedState?.stateVersion ?? null;
  }

  async updateOperationalStateIfMatches(
    auctionSessionId: string,
    expectedStateVersion: number,
    update: AuctionSessionOperationalStateUpdate
  ): Promise<AuctionSessionState | null> {
    return this.updateOperationalStateIfMatchesWithExecutor(
      db,
      auctionSessionId,
      expectedStateVersion,
      update
    );
  }

  updateOperationalStateIfMatchesWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string,
    expectedStateVersion: number,
    update: AuctionSessionOperationalStateUpdate
  ): AuctionSessionState | null {
    const [updatedState] = executor
      .update(auctionSessions)
      .set({
        status:
          update.status,
        suspensionReason:
          update.suspensionReason,
        stateVersion:
          sql`${auctionSessions.stateVersion} + 1`,
        updatedAt:
          sql`CURRENT_TIMESTAMP`
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
        auctionSessionId:
          auctionSessions.id,
        status:
          auctionSessions.status,
        suspensionReason:
          auctionSessions.suspensionReason,
        stateVersion:
          auctionSessions.stateVersion
      })
      .all();

    return updatedState ?? null;
  }

}
