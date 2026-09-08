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
  "GET /api/auction-sessions/:id/fms-roster-export",
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

    async function seedCompleteTeam(
      input: {
        leagueId: string;
        sessionId: string;
        teamId: string;
        sessionTeamId: string;
        tableOrder: number;
        teamName: string;
        suffix: string;
      }
    ): Promise<void> {
      await db.insert(teams).values({
        id: input.teamId,
        leagueId: input.leagueId,
        name: input.teamName
      });

      await db
        .insert(auctionSessionTeams)
        .values({
          id: input.sessionTeamId,
          auctionSessionId:
            input.sessionId,
          teamId: input.teamId,
          tableOrder:
            input.tableOrder,
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

      for (
        const [role, count]
        of roleCounts
      ) {
        for (
          let roleIndex = 1;
          roleIndex <= count;
          roleIndex += 1
        ) {
          const playerId =
            `player-${input.suffix}-${index}`;

          const name =
            `${input.suffix}-${role}-${roleIndex}`;

          playerRows.push({
            id: playerId,
            auctionSessionId:
              input.sessionId,
            fmsCode:
              `fms-${input.suffix}-${index}`,
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
              `roster-${input.suffix}-${index}`,
            auctionSessionTeamId:
              input.sessionTeamId,
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
        `export-goalkeeper-${input.suffix}`;

      await db.insert(players).values({
        id: exportGoalkeeperId,
        auctionSessionId:
          input.sessionId,
        fmsCode:
          `fms-export-goalkeeper-${input.suffix}`,
        name:
          `EXPORT GOALKEEPER ${input.suffix}`,
        normalizedName:
          `export goalkeeper ${input.suffix}`
            .toLocaleLowerCase(
              "it-IT"
            ),
        realTeamName: "Roma",
        role: "P",
        availabilityStatus:
          "AVAILABLE"
      });

      await db
        .insert(fmsExportGoalkeepers)
        .values({
          id:
            `selection-${input.suffix}`,
          auctionSessionTeamId:
            input.sessionTeamId,
          playerId:
            exportGoalkeeperId
        });
    }

    it("returns ordered FMS roster files for the whole auction session", async () => {
      const leagueId =
        "league-fms-session-export-http";
      const sessionId =
        "session-fms-session-export-http";

      await db.insert(leagues).values({
        id: leagueId,
        name:
          "FMS Session Export HTTP League",
        normalizedName:
          "fms session export http league"
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber: 81,
        initialCredits: 300,
        status: "COMPLETED"
      });

      await seedCompleteTeam({
        leagueId,
        sessionId,
        teamId:
          "team-fms-session-export-2",
        sessionTeamId:
          "session-team-fms-session-export-2",
        tableOrder: 2,
        teamName: "Team / Two",
        suffix: "team2"
      });

      await seedCompleteTeam({
        leagueId,
        sessionId,
        teamId:
          "team-fms-session-export-1",
        sessionTeamId:
          "session-team-fms-session-export-1",
        tableOrder: 1,
        teamName: "Abbaweb",
        suffix: "team1"
      });

      const response =
        await app.inject({
          method: "GET",
          url:
            `/api/auction-sessions/${sessionId}/fms-roster-export`
        });

      expect(response.statusCode).toBe(200);

      const body =
        response.json();

      expect(body.error).toBeNull();
      expect(body.data).toHaveLength(2);

      expect(
        body.data.map(
          (file: {
            tableOrder: number;
            filename: string;
          }) => ({
            tableOrder:
              file.tableOrder,
            filename:
              file.filename
          })
        )
      ).toEqual([
        {
          tableOrder: 1,
          filename:
            "Abbaweb.txt"
        },
        {
          tableOrder: 2,
          filename:
            "Team _ Two.txt"
        }
      ]);

      for (const file of body.data) {
        expect(
          file.content.endsWith("\r\n")
        ).toBe(true);

        expect(
          file.content
        ).not.toMatch(
          /(?<!\r)\n/
        );

        const lines =
          file.content
            .slice(0, -2)
            .split("\r\n");

        expect(lines).toHaveLength(25);

        expect(
          lines.some(
            (line: string) =>
              line.startsWith(
                "Portiere\tEXPORT GOALKEEPER"
              ) &&
              line.endsWith(
                "\t0\t1"
              )
          )
        ).toBe(true);
      }
    });

    it("returns 404 for a missing auction session", async () => {
      const response =
        await app.inject({
          method: "GET",
          url:
            "/api/auction-sessions/missing-fms-session-export/fms-roster-export"
        });

      expect(response.statusCode).toBe(404);

      expect(response.json()).toEqual({
        data: null,
        error: {
          code:
            "AUCTION_SESSION_NOT_FOUND",
          message:
            'Auction session "missing-fms-session-export" was not found'
        }
      });
    });
  }
);
