import {
  asc,
  eq
} from "drizzle-orm";

import type {
  RealtimeAuctionSessionTeam
} from "@fantaastaapp/contracts";

import {
  db
} from "../db/client.js";
import {
  auctionSessionTeams
} from "../db/schema/index.js";

export interface RealtimeSnapshotTeamReader {
  findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimeAuctionSessionTeam[]>;
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
