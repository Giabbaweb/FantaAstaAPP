import {
  and,
  asc,
  desc,
  eq
} from "drizzle-orm";

import type {
  AuctionSession,
  PlayerRole,
  RealtimeAuctionSessionTeam
} from "@fantaastaapp/contracts";

import {
  db
} from "../db/client.js";
import {
  auctionEvents,
  auctionSessions,
  auctionSessionTeams,
  leagues,
  players,
  rosterEntries,
  teams
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

export type RealtimePublicDisplayLeagueData = {
  id: string;
  name: string;
};

export type RealtimePublicDisplayTeamData = {
  auctionSessionTeamId: string;
  teamId: string;
  teamName: string;
  shortName: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoPath: string | null;
  tableOrder: number;
  remainingCredits: number;
  roleCounts: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  rosterEntries: {
    rosterEntryId: string;
    playerId: string;
    playerName: string;
    realTeamName: string | null;
    role: PlayerRole;
    acquisitionCost: number;
  }[];
};

export type RealtimePublicDisplayPlayerData = {
  id: string;
  name: string;
  realTeamName: string | null;
  role: PlayerRole;
};

export type RealtimePublicDisplayRecentAwardData = {
  eventId: string;
  playerId: string;
  playerName: string;
  role: PlayerRole;
  auctionSessionTeamId: string;
  teamName: string;
  amount: number;
  confirmedAt: string;
};


export interface RealtimePublicDisplayReader {
  findLeagueByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimePublicDisplayLeagueData | null>;

  findTeamsByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimePublicDisplayTeamData[]>;

  findPlayerById(
    playerId: string
  ): Promise<RealtimePublicDisplayPlayerData | null>;

  findRecentAwardsByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimePublicDisplayRecentAwardData[]>;
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
export class SqliteRealtimePublicDisplayReader
  implements RealtimePublicDisplayReader
{
  async findLeagueByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimePublicDisplayLeagueData | null> {
    const [record] = await db
      .select({
        id: leagues.id,
        name: leagues.name
      })
      .from(auctionSessions)
      .innerJoin(
        leagues,
        eq(
          auctionSessions.leagueId,
          leagues.id
        )
      )
      .where(
        eq(
          auctionSessions.id,
          auctionSessionId
        )
      )
      .limit(1);

    return record ?? null;
  }

  async findTeamsByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimePublicDisplayTeamData[]> {
    const teamRecords = await db
      .select({
        auctionSessionTeamId:
          auctionSessionTeams.id,
        teamId: auctionSessionTeams.teamId,
        teamName: teams.name,
        shortName: teams.shortName,
        primaryColor: teams.primaryColor,
        secondaryColor: teams.secondaryColor,
        logoPath: teams.logoPath,
        tableOrder:
          auctionSessionTeams.tableOrder,
        remainingCredits:
          auctionSessionTeams.remainingCredits
      })
      .from(auctionSessionTeams)
      .innerJoin(
        teams,
        eq(
          auctionSessionTeams.teamId,
          teams.id
        )
      )
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

    const rosterRecords = await db
      .select({
        auctionSessionTeamId:
          rosterEntries.auctionSessionTeamId,
        rosterEntryId: rosterEntries.id,
        playerId: players.id,
        playerName: players.name,
        realTeamName: players.realTeamName,
        role: players.role,
        acquisitionCost:
          rosterEntries.acquisitionCost
      })
      .from(rosterEntries)
      .innerJoin(
        auctionSessionTeams,
        eq(
          rosterEntries.auctionSessionTeamId,
          auctionSessionTeams.id
        )
      )
      .innerJoin(
        players,
        eq(
          rosterEntries.playerId,
          players.id
        )
      )
      .where(
        eq(
          auctionSessionTeams.auctionSessionId,
          auctionSessionId
        )
      );

    const roleCountsByTeam =
      new Map<
        string,
        {
          P: number;
          D: number;
          C: number;
          A: number;
        }
      >();

    const rosterEntriesByTeam =
      new Map<
        string,
        RealtimePublicDisplayTeamData["rosterEntries"]
      >();

    for (const record of rosterRecords) {
      const counts =
        roleCountsByTeam.get(
          record.auctionSessionTeamId
        ) ?? {
          P: 0,
          D: 0,
          C: 0,
          A: 0
        };

      counts[record.role] += 1;

      roleCountsByTeam.set(
        record.auctionSessionTeamId,
        counts
      );

      const entries =
        rosterEntriesByTeam.get(
          record.auctionSessionTeamId
        ) ?? [];

      entries.push({
        rosterEntryId: record.rosterEntryId,
        playerId: record.playerId,
        playerName: record.playerName,
        realTeamName: record.realTeamName,
        role: record.role,
        acquisitionCost:
          record.acquisitionCost
      });

      rosterEntriesByTeam.set(
        record.auctionSessionTeamId,
        entries
      );
    }

    return teamRecords.map((record) => ({
      ...record,
      roleCounts:
        roleCountsByTeam.get(
          record.auctionSessionTeamId
        ) ?? {
          P: 0,
          D: 0,
          C: 0,
          A: 0
        },
        rosterEntries:
          rosterEntriesByTeam.get(
            record.auctionSessionTeamId
          ) ?? []
    }));
  }
  async findRecentAwardsByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimePublicDisplayRecentAwardData[]> {
    return db
      .select({
        eventId: auctionEvents.id,
        playerId: players.id,
        playerName: players.name,
        role: players.role,
        auctionSessionTeamId:
          auctionEvents.auctionSessionTeamId,
        teamName: teams.name,
        amount: auctionEvents.amount,
        confirmedAt: auctionEvents.createdAt
      })
      .from(auctionEvents)
      .innerJoin(
        players,
        eq(
          auctionEvents.playerId,
          players.id
        )
      )
      .innerJoin(
        auctionSessionTeams,
        eq(
          auctionEvents.auctionSessionTeamId,
          auctionSessionTeams.id
        )
      )
      .innerJoin(
        teams,
        eq(
          auctionSessionTeams.teamId,
          teams.id
        )
      )
      .where(
        and(
          eq(
            auctionEvents.auctionSessionId,
            auctionSessionId
          ),
          eq(
            auctionEvents.eventType,
            "AUCTION_AWARD_CONFIRMED"
          )
        )
      )
      .orderBy(
        desc(auctionEvents.createdAt),
        desc(auctionEvents.id)
      );
  }

  async findPlayerById(
    playerId: string
  ): Promise<RealtimePublicDisplayPlayerData | null> {
    const [record] = await db
      .select({
        id: players.id,
        name: players.name,
        realTeamName: players.realTeamName,
        role: players.role
      })
      .from(players)
      .where(
        eq(
          players.id,
          playerId
        )
      )
      .limit(1);

    return record ?? null;
  }
}
