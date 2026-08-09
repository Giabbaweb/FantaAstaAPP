import {
  asc,
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
  auctionSessions,
  auctionSessionTeams,
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
};

export type RealtimePublicDisplayPlayerData = {
  id: string;
  name: string;
  role: PlayerRole;
};

export interface RealtimePublicDisplayReader {
  findTeamsByAuctionSessionId(
    auctionSessionId: string
  ): Promise<RealtimePublicDisplayTeamData[]>;

  findPlayerById(
    playerId: string
  ): Promise<RealtimePublicDisplayPlayerData | null>;
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
        role: players.role
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
        }
    }));
  }
  async findPlayerById(
    playerId: string
  ): Promise<RealtimePublicDisplayPlayerData | null> {
    const [record] = await db
      .select({
        id: players.id,
        name: players.name,
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
