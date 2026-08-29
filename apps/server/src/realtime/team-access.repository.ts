import {
  eq
} from "drizzle-orm";

import {
  db
} from "../db/client.js";
import {
  auctionSessionTeams
} from "../db/schema/index.js";

export type TeamAccessCredential = {
  auctionSessionTeamId: string;
  auctionSessionId: string;
  accessPinHash: string | null;
};

export interface TeamAccessRepository {
  findByAuctionSessionTeamId(
    auctionSessionTeamId: string
  ): Promise<TeamAccessCredential | null>;

  findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<TeamAccessCredential[]>;

  updateAccessPinHash(
    auctionSessionTeamId: string,
    accessPinHash: string
  ): Promise<boolean>;
}

export class SqliteTeamAccessRepository
  implements TeamAccessRepository
{
  async findByAuctionSessionTeamId(
    auctionSessionTeamId: string
  ): Promise<TeamAccessCredential | null> {
    const [credential] = await db
      .select({
        auctionSessionTeamId:
          auctionSessionTeams.id,
        auctionSessionId:
          auctionSessionTeams.auctionSessionId,
        accessPinHash:
          auctionSessionTeams.accessPinHash
      })
      .from(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.id,
          auctionSessionTeamId
        )
      )
      .limit(1);

    return credential ?? null;
  }

  async findByAuctionSessionId(
    auctionSessionId: string
  ): Promise<TeamAccessCredential[]> {
    return db
      .select({
        auctionSessionTeamId:
          auctionSessionTeams.id,
        auctionSessionId:
          auctionSessionTeams.auctionSessionId,
        accessPinHash:
          auctionSessionTeams.accessPinHash
      })
      .from(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.auctionSessionId,
          auctionSessionId
        )
      );
  }

  async updateAccessPinHash(
    auctionSessionTeamId: string,
    accessPinHash: string
  ): Promise<boolean> {
    const updatedRows = await db
      .update(auctionSessionTeams)
      .set({
        accessPinHash
      })
      .where(
        eq(
          auctionSessionTeams.id,
          auctionSessionTeamId
        )
      )
      .returning({
        id: auctionSessionTeams.id
      });

    return updatedRows.length > 0;
  }
}
