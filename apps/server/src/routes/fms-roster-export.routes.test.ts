import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import {
  buildApp
} from "../app.js";
import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  fmsExportGoalkeepers,
  leagues,
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";

describe(
  "GET /api/auction-session-teams/:id/fms-roster-export",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it("downloads a complete FMS roster file", async () => {
      const leagueId =
        "league-fms-export-http";
      const sessionId =
        "session-fms-export-http";
      const teamId =
        "team-fms-export-http";
      const sessionTeamId =
        "session-team-fms-export-http";

      await db.insert(leagues).values({
        id: leagueId,
        name: "FMS Export HTTP League",
        normalizedName:
          "fms export http league"
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber: 51,
        initialCredits: 300,
        status: "COMPLETED"
      });

      await db.insert(teams).values({
        id: teamId,
        leagueId,
        name: "Abbaweb"
      });

      await db
        .insert(auctionSessionTeams)
        .values({
          id: sessionTeamId,
          auctionSessionId: sessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 100
        });

      const roleCounts = [
        ["P", 2],
        ["D", 8],
        ["C", 8],
        ["A", 6]
      ] as const;

      const playerRows: Array<
        typeof players.$inferInsert
      > = [];

      const rosterRows: Array<
        typeof rosterEntries.$inferInsert
      > = [];

      let index = 1;

      for (const [role, count] of roleCounts) {
        for (
          let roleIndex = 1;
          roleIndex <= count;
          roleIndex += 1
        ) {
          const playerId =
            `player-fms-export-http-${index}`;

          const name =
            `${role}-${roleIndex}`;

          playerRows.push({
            id: playerId,
            auctionSessionId: sessionId,
            fmsCode:
              `fms-export-http-${index}`,
            name,
            normalizedName:
              name.toLocaleLowerCase(
                "it-IT"
              ),
            role,
            availabilityStatus:
              "ROSTERED"
          });

          rosterRows.push({
            id:
              `roster-entry-fms-export-http-${index}`,
            auctionSessionTeamId:
              sessionTeamId,
            playerId,
            acquisitionCost: 1,
            contractYear: 1,
            source: "AUCTION"
          });

          index += 1;
        }
      }

      await db.insert(players).values(
        playerRows
      );

      await db.insert(rosterEntries).values(
        rosterRows
      );

      const exportGoalkeeperId =
        "player-fms-export-http-goalkeeper";

      await db.insert(players).values({
        id: exportGoalkeeperId,
        auctionSessionId: sessionId,
        fmsCode:
          "fms-export-http-goalkeeper",
        name: "EXPORT GOALKEEPER",
        normalizedName:
          "export goalkeeper",
        realTeamName: "Roma",
        role: "P",
        availabilityStatus:
          "AVAILABLE"
      });

      await db
        .insert(fmsExportGoalkeepers)
        .values({
          id:
            "fms-export-goalkeeper-http-selection",
          auctionSessionTeamId:
            sessionTeamId,
          playerId:
            exportGoalkeeperId
        });

      const response =
        await app.inject({
          method: "GET",
          url:
            `/api/auction-session-teams/${sessionTeamId}/fms-roster-export`
        });

      expect(
        response.statusCode
      ).toBe(200);

      expect(
        response.headers[
          "content-type"
        ]
      ).toContain(
        "text/plain"
      );

      expect(
        response.headers[
          "content-disposition"
        ]
      ).toBe(
        'attachment; filename="Abbaweb.txt"'
      );

      const lines =
        response.body.split("\n");

      expect(lines).toHaveLength(25);

      expect(lines).toContain(
        "Portiere\tEXPORT GOALKEEPER\t0\t1"
      );

      expect(lines[24]).toBe(
        "Attaccante\tA-6\t1\t1"
      );
    });
    it("returns 404 for a missing auction session team", async () => {
      const response =
        await app.inject({
          method: "GET",
          url:
            "/api/auction-session-teams/missing-fms-export-team/fms-roster-export"
        });

      expect(
        response.statusCode
      ).toBe(404);

      expect(
        response.json()
      ).toEqual({
        data: null,
        error: {
          code:
            "AUCTION_SESSION_TEAM_NOT_FOUND",
          message:
            'Auction session team "missing-fms-export-team" was not found'
        }
      });
    });

    it("returns 409 when the auction session is not exportable", async () => {
      const leagueId =
        "league-fms-export-running-http";
      const sessionId =
        "session-fms-export-running-http";
      const teamId =
        "team-fms-export-running-http";
      const sessionTeamId =
        "session-team-fms-export-running-http";

      await db.insert(leagues).values({
        id: leagueId,
        name:
          "FMS Export Running HTTP League",
        normalizedName:
          "fms export running http league"
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber: 52,
        initialCredits: 300,
        status: "RUNNING"
      });

      await db.insert(teams).values({
        id: teamId,
        leagueId,
        name: "Running Team"
      });

      await db
        .insert(auctionSessionTeams)
        .values({
          id: sessionTeamId,
          auctionSessionId: sessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 300
        });

      const response =
        await app.inject({
          method: "GET",
          url:
            `/api/auction-session-teams/${sessionTeamId}/fms-roster-export`
        });

      expect(
        response.statusCode
      ).toBe(409);

      expect(
        response.json()
      ).toEqual({
        data: null,
        error: {
          code:
            "AUCTION_SESSION_NOT_EXPORTABLE",
          message:
            `Auction session "${sessionId}" cannot be exported from status "RUNNING"`
        }
      });
    });

    it("returns 409 for an incomplete roster", async () => {
      const leagueId =
        "league-fms-export-incomplete-http";
      const sessionId =
        "session-fms-export-incomplete-http";
      const teamId =
        "team-fms-export-incomplete-http";
      const sessionTeamId =
        "session-team-fms-export-incomplete-http";
      const playerId =
        "player-fms-export-incomplete-http";

      await db.insert(leagues).values({
        id: leagueId,
        name:
          "FMS Export Incomplete HTTP League",
        normalizedName:
          "fms export incomplete http league"
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber: 53,
        initialCredits: 300,
        status: "COMPLETED"
      });

      await db.insert(teams).values({
        id: teamId,
        leagueId,
        name: "Incomplete Team"
      });

      await db
        .insert(auctionSessionTeams)
        .values({
          id: sessionTeamId,
          auctionSessionId: sessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 299
        });

      await db.insert(players).values({
        id: playerId,
        auctionSessionId: sessionId,
        fmsCode:
          "fms-export-incomplete-1",
        name: "INCOMPLETE PLAYER",
        normalizedName:
          "incomplete player",
        role: "P",
        availabilityStatus:
          "ROSTERED"
      });

      await db.insert(rosterEntries).values({
        id:
          "roster-entry-fms-export-incomplete-http",
        auctionSessionTeamId:
          sessionTeamId,
        playerId,
        acquisitionCost: 1,
        contractYear: 1,
        source: "AUCTION"
      });

      const response =
        await app.inject({
          method: "GET",
          url:
            `/api/auction-session-teams/${sessionTeamId}/fms-roster-export`
        });

      expect(
        response.statusCode
      ).toBe(409);

      expect(
        response.json()
      ).toEqual({
        data: null,
        error: {
          code:
            "INVALID_ROSTER_SIZE",
          message:
            "FMS roster export requires exactly 24 players"
        }
      });
    });

  }
);
