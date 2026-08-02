import {
  asc,
  eq
} from "drizzle-orm";

import type {
  AuctionSession,
  RealtimeAuctionSessionTeam
} from "@fantaastaapp/contracts";

import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams
} from "../db/schema/index.js";

export type RealtimeSnapshotSessionState = {
  session: AuctionSession;
  stateVersion: number;
};

export interface RealtimeSnapshotSessionReader {
  findById(
    auctionSessionId: string
  ): Promise<RealtimeSnapshotSessionState | null>;
}

export interface RealtimeSnapshotTeamReader {
  findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimeAuctionSessionTeam[]>;
}

export class SqliteRealtimeSnapshotSessionReader
  implements RealtimeSnapshotSessionReader
{
  async findById(
    auctionSessionId: string
  ): Promise<RealtimeSnapshotSessionState | null> {
    const [record] = await db
      .select({
        id: auctionSessions.id,
        leagueId: auctionSessions.leagueId,
        season: auctionSessions.season,
        editionNumber:
          auctionSessions.editionNumber,
        status: auctionSessions.status,
        initialCredits:
          auctionSessions.initialCredits,
        stateVersion:
          auctionSessions.stateVersion,
        createdAt: auctionSessions.createdAt,
        updatedAt: auctionSessions.updatedAt
      })
      .from(auctionSessions)
      .where(
        eq(
          auctionSessions.id,
          auctionSessionId
        )
      )
      .limit(1);

    if (!record) {
      return null;
    }

    const {
      stateVersion,
      ...session
    } = record;

    return {
      session,
      stateVersion
    };
  }
}

export class SqliteRealtimeSnapshotTeamReader
  implements RealtimeSnapshotTeamReader
{
  async findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimeAuctionSessionTeam[]> {
    return db
      .select({
        id: auctionSessionTeams.id,
        auctionSessionId:
          auctionSessionTeams.auctionSessionId,
        teamId: auctionSessionTeams.teamId,
        tableOrder:
          auctionSessionTeams.tableOrder,
        renewalCredits:
          auctionSessionTeams.renewalCredits,
        remainingCredits:
          auctionSessionTeams.remainingCredits
      })
      .from(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.auctionSessionId,
          auctionSessionId
        )
      )
      .orderBy(
        asc(auctionSessionTeams.tableOrder),
        asc(auctionSessionTeams.id)
      );
  }
}
