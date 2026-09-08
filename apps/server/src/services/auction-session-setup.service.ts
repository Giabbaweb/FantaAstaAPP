import { randomUUID } from "node:crypto";

import type {
  AuctionSession,
  AuctionSessionTeam,
  CreateAuctionSessionInput
} from "@fantaastaapp/contracts";
import {
  asc,
  eq
} from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  teams
} from "../db/schema/index.js";

export type AuctionSessionSetupResult = {
  session: AuctionSession;
  sessionTeams: AuctionSessionTeam[];
};

export type AuctionSessionSetupServiceErrorCode =
  | "INVALID_LEAGUE_TEAM_COUNT"
  | "SESSION_SETUP_FAILED";

export class AuctionSessionSetupServiceError
  extends Error {
  readonly code:
    AuctionSessionSetupServiceErrorCode;

  constructor(
    code: AuctionSessionSetupServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "AuctionSessionSetupServiceError";
    this.code = code;
  }
}

const sessionSelection = {
  id: auctionSessions.id,
  leagueId: auctionSessions.leagueId,
  season: auctionSessions.season,
  editionNumber:
    auctionSessions.editionNumber,
  status: auctionSessions.status,
  suspensionReason:
    auctionSessions.suspensionReason,
  initialCredits:
    auctionSessions.initialCredits,
  maximumInitialRosterEntries:
    auctionSessions.maximumInitialRosterEntries,
  remoteBaseUrl:
    auctionSessions.remoteBaseUrl,
  createdAt: auctionSessions.createdAt,
  updatedAt: auctionSessions.updatedAt
};

const sessionTeamSelection = {
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
};

export class AuctionSessionSetupService {
  execute(
    input: CreateAuctionSessionInput
  ): AuctionSessionSetupResult {
    try {
      return db.transaction((tx) => {
        const leagueTeams =
          tx
            .select({
              id: teams.id,
              name: teams.name
            })
            .from(teams)
            .where(
              eq(
                teams.leagueId,
                input.leagueId
              )
            )
            .orderBy(
              asc(teams.name),
              asc(teams.id)
            )
            .all();

        if (leagueTeams.length !== 8) {
          throw new AuctionSessionSetupServiceError(
            "INVALID_LEAGUE_TEAM_COUNT",
            `League "${input.leagueId}" must contain exactly 8 teams before creating an auction session; found ${leagueTeams.length}`
          );
        }

        const [session] =
          tx
            .insert(auctionSessions)
            .values({
              id: randomUUID(),
              leagueId: input.leagueId,
              season: input.season,
              editionNumber:
                input.editionNumber,
              initialCredits:
                input.initialCredits,
              maximumInitialRosterEntries:
                input.maximumInitialRosterEntries
            })
            .returning(
              sessionSelection
            )
            .all();

        if (!session) {
          throw new AuctionSessionSetupServiceError(
            "SESSION_SETUP_FAILED",
            "Failed to create auction session"
          );
        }

        const sessionTeamValues =
          leagueTeams.map(
            (team, index) => ({
              id: randomUUID(),
              auctionSessionId:
                session.id,
              teamId: team.id,
              tableOrder: index + 1,
              renewalCredits: 0,
              remainingCredits:
                input.initialCredits
            })
          );

        const createdSessionTeams =
          tx
            .insert(
              auctionSessionTeams
            )
            .values(
              sessionTeamValues
            )
            .returning(
              sessionTeamSelection
            )
            .all();

        if (
          createdSessionTeams.length !==
          leagueTeams.length
        ) {
          throw new AuctionSessionSetupServiceError(
            "SESSION_SETUP_FAILED",
            "Failed to create all auction session teams"
          );
        }

        return {
          session,
          sessionTeams:
            createdSessionTeams
              .sort(
                (left, right) =>
                  left.tableOrder -
                  right.tableOrder
              )
        };
      });
    } catch (error) {
      if (
        error instanceof
        AuctionSessionSetupServiceError
      ) {
        throw error;
      }

      if (
        error instanceof Error &&
        "code" in error &&
        (
          error.code ===
            "SQLITE_CONSTRAINT_FOREIGNKEY" ||
          error.code ===
            "SQLITE_CONSTRAINT_UNIQUE"
        )
      ) {
        throw error;
      }

      throw new AuctionSessionSetupServiceError(
        "SESSION_SETUP_FAILED",
        error instanceof Error
          ? error.message
          : "Failed to create auction session setup"
      );
    }
  }
}
