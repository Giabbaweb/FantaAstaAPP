import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  leagues,
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";
import type {
  InitialRosterImportPlan
} from "../import/player-import.types.js";
import {
  InitialRosterImportService
} from "./initial-roster-import.service.js";

const leagueId = "league-initial-roster-test";
const auctionSessionId =
  "session-initial-roster-test";
const teamId = "team-initial-roster-test";
const auctionSessionTeamId =
  "session-team-initial-roster-test";
const playerId = "player-initial-roster-test";

describe("InitialRosterImportService", () => {
  afterEach(() => {
    db.delete(rosterEntries)
      .where(eq(rosterEntries.playerId, playerId))
      .run();

    db.delete(players)
      .where(eq(players.id, playerId))
      .run();

    db.delete(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.id,
          auctionSessionTeamId
        )
      )
      .run();

    db.delete(teams)
      .where(eq(teams.id, teamId))
      .run();

    db.delete(auctionSessions)
      .where(eq(auctionSessions.id, auctionSessionId))
      .run();

    db.delete(leagues)
      .where(eq(leagues.id, leagueId))
      .run();
  });

  it(
    "imports a roster entry and updates player and credits",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Initial Roster Test League",
          normalizedName:
            "initial roster test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 99,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Initial Roster Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 330
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "TEST-001",
          name: "Test Player",
          normalizedName: "test player",
          role: "C",
          availabilityStatus: "AVAILABLE"
        })
        .run();

      const plan: InitialRosterImportPlan = {
        entries: [
          {
            rowNumber: 1,
            auctionSessionTeamId,
            playerId,
            acquisitionCost: 25,
            contractYear: 2,
            source: "INITIAL_ROSTER"
          }
        ],
        parserIssues: [],
        planningIssues: [],
        summary: {
          parsedRows: 1,
          validEntries: 1,
          parserIssueCount: 0,
          planningIssueCount: 0
        }
      };

      const service =
        new InitialRosterImportService();

      const result = await service.execute(plan);

      expect(result).toEqual({
        importedEntries: 1,
        totalCost: 25
      });

      const storedRosterEntries = db
        .select()
        .from(rosterEntries)
        .where(
          eq(rosterEntries.playerId, playerId)
        )
        .all();

      expect(storedRosterEntries).toHaveLength(1);

      expect(storedRosterEntries[0]).toMatchObject({
        auctionSessionTeamId,
        playerId,
        acquisitionCost: 25,
        contractYear: 2,
        source: "INITIAL_ROSTER"
      });

      const storedPlayers = db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .all();

      expect(storedPlayers[0]?.availabilityStatus).toBe(
        "ROSTERED"
      );

      const storedSessionTeams = db
        .select()
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.id,
            auctionSessionTeamId
          )
        )
        .all();

      expect(
        storedSessionTeams[0]?.remainingCredits
      ).toBe(305);
    }
  );
});
