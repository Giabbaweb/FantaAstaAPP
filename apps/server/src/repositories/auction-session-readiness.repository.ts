import {
  and,
  eq,
  inArray
} from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  players,
  rosterEntries,
  teamOwners
} from "../db/schema/index.js";

export type AuctionSessionReadinessSnapshot = {
  session: {
    id: string;
    status: string;
    initialCredits: number;
    maximumInitialRosterEntries: number;
  } | null;

  sessionTeams: Array<{
    id: string;
    teamId: string;
    tableOrder: number;
  }>;

  teamOwnerTeamIds: string[];

  playerCount: number;

  rosterEntrySessionTeamIds: string[];
};

export interface AuctionSessionReadinessRepository {
  inspect(
    auctionSessionId: string
  ): Promise<AuctionSessionReadinessSnapshot>;
}

export class SqliteAuctionSessionReadinessRepository
  implements AuctionSessionReadinessRepository
{
  async inspect(
    auctionSessionId: string
  ): Promise<AuctionSessionReadinessSnapshot> {
    const [session] =
      await db
        .select({
          id: auctionSessions.id,
          status: auctionSessions.status,
          initialCredits:
            auctionSessions.initialCredits,
          maximumInitialRosterEntries:
            auctionSessions
              .maximumInitialRosterEntries
        })
        .from(auctionSessions)
        .where(
          eq(
            auctionSessions.id,
            auctionSessionId
          )
        )
        .limit(1);

    if (!session) {
      return {
        session: null,
        sessionTeams: [],
        teamOwnerTeamIds: [],
        playerCount: 0,
        rosterEntrySessionTeamIds: []
      };
    }

    const sessionTeamsRows =
      await db
        .select({
          id: auctionSessionTeams.id,
          teamId:
            auctionSessionTeams.teamId,
          tableOrder:
            auctionSessionTeams.tableOrder
        })
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams
              .auctionSessionId,
            auctionSessionId
          )
        );

    const teamIds =
      sessionTeamsRows.map(
        (record) => record.teamId
      );

    const sessionTeamIds =
      sessionTeamsRows.map(
        (record) => record.id
      );

    const ownerRows =
      teamIds.length > 0
        ? await db
            .select({
              teamId: teamOwners.teamId
            })
            .from(teamOwners)
            .where(
              inArray(
                teamOwners.teamId,
                teamIds
              )
            )
        : [];

    const playerRows =
      await db
        .select({
          id: players.id
        })
        .from(players)
        .where(
          eq(
            players.auctionSessionId,
            auctionSessionId
          )
        );

    const rosterRows =
      sessionTeamIds.length > 0
        ? await db
            .select({
              auctionSessionTeamId:
                rosterEntries
                  .auctionSessionTeamId
            })
            .from(rosterEntries)
            .where(
              and(
                inArray(
                  rosterEntries
                    .auctionSessionTeamId,
                  sessionTeamIds
                ),
                eq(
                  rosterEntries.source,
                  "INITIAL_ROSTER"
                )
              )
            )
        : [];

    return {
      session,
      sessionTeams:
        sessionTeamsRows,
      teamOwnerTeamIds:
        [
          ...new Set(
            ownerRows.map(
              (record) =>
                record.teamId
            )
          )
        ],
      playerCount:
        playerRows.length,
      rosterEntrySessionTeamIds:
        rosterRows.map(
          (record) =>
            record.auctionSessionTeamId
        )
    };
  }
}
