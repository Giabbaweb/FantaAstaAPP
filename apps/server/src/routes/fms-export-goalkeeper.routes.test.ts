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
  "PUT /api/auction-session-teams/:id/fms-export-goalkeeper",
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

    async function seedScenario(
      suffix: string
    ): Promise<{
      sessionId: string;
      sessionTeamId: string;
    }> {
      const leagueId =
        `league-fms-goalkeeper-http-${suffix}`;
      const sessionId =
        `session-fms-goalkeeper-http-${suffix}`;
      const teamId =
        `team-fms-goalkeeper-http-${suffix}`;
      const sessionTeamId =
        `session-team-fms-goalkeeper-http-${suffix}`;

      await db.insert(leagues).values({
        id: leagueId,
        name:
          `FMS Goalkeeper HTTP ${suffix}`,
        normalizedName:
          `fms goalkeeper http ${suffix}`
      });

      await db.insert(auctionSessions).values({
        id: sessionId,
        leagueId,
        season: "2026/2027",
        editionNumber:
          suffix === "success" ? 70 :
          suffix === "invalid-body" ? 71 :
          72,
        initialCredits: 300,
        status: "COMPLETED"
      });

      await db.insert(teams).values({
        id: teamId,
        leagueId,
        name: `Team ${suffix}`
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

      for (
        const [index, realTeamName]
        of [
          [1, "Milan"],
          [2, "Inter"]
        ] as const
      ) {
        const playerId =
          `goalkeeper-http-${suffix}-${index}`;

        await db.insert(players).values({
          id: playerId,
          auctionSessionId: sessionId,
          fmsCode: playerId,
          name: playerId,
          normalizedName:
            playerId.toLocaleLowerCase("it-IT"),
          realTeamName,
          role: "P",
          availabilityStatus: "ROSTERED"
        });

        await db.insert(rosterEntries).values({
          id: `roster-${playerId}`,
          auctionSessionTeamId:
            sessionTeamId,
          playerId,
          acquisitionCost: 1,
          contractYear: 1,
          source: "AUCTION"
        });
      }

      return {
        sessionId,
        sessionTeamId
      };
    }

    it("stores a valid FMS export goalkeeper selection", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedScenario("success");

      const candidateId =
        "goalkeeper-http-success-candidate";

      await db.insert(players).values({
        id: candidateId,
        auctionSessionId: sessionId,
        fmsCode: candidateId,
        name: candidateId,
        normalizedName:
          candidateId.toLocaleLowerCase("it-IT"),
        realTeamName: "Milan",
        role: "P",
        availabilityStatus: "AVAILABLE"
      });

      const response =
        await app.inject({
          method: "PUT",
          url:
            `/api/auction-session-teams/${sessionTeamId}/fms-export-goalkeeper`,
          payload: {
            playerId: candidateId
          }
        });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        data: expect.objectContaining({
          auctionSessionTeamId:
            sessionTeamId,
          playerId: candidateId
        }),
        error: null
      });

      const stored =
        await db
          .select()
          .from(fmsExportGoalkeepers);

      expect(stored).toHaveLength(1);

      expect(stored[0]).toEqual(
        expect.objectContaining({
          auctionSessionTeamId:
            sessionTeamId,
          playerId: candidateId
        })
      );
    });

    it(
      "returns null when no export goalkeeper is selected",
      async () => {
        const {
          sessionTeamId
        } = await seedScenario(
          "get-empty"
        );

        const response =
          await app.inject({
            method: "GET",
            url:
              `/api/auction-session-teams/${sessionTeamId}/fms-export-goalkeeper`
          });

        expect(
          response.statusCode
        ).toBe(200);

        expect(
          response.json()
        ).toEqual({
          data: null,
          error: null
        });
      }
    );

    it(
      "returns the persisted export goalkeeper selection",
      async () => {
        const {
          sessionId,
          sessionTeamId
        } = await seedScenario(
          "get-selected"
        );

        const candidateId =
          "goalkeeper-http-get-selected-candidate";

        await db.insert(players).values({
          id: candidateId,
          auctionSessionId: sessionId,
          fmsCode: candidateId,
          name:
            "Goalkeeper HTTP Get Selected",
          normalizedName:
            "goalkeeper http get selected",
          realTeamName: "Milan",
          role: "P",
          availabilityStatus: "AVAILABLE"
        });

        const putResponse =
          await app.inject({
            method: "PUT",
            url:
              `/api/auction-session-teams/${sessionTeamId}/fms-export-goalkeeper`,
            payload: {
              playerId: candidateId
            }
          });

        expect(
          putResponse.statusCode
        ).toBe(200);

        const getResponse =
          await app.inject({
            method: "GET",
            url:
              `/api/auction-session-teams/${sessionTeamId}/fms-export-goalkeeper`
          });

        expect(
          getResponse.statusCode
        ).toBe(200);

        expect(
          getResponse.json()
        ).toEqual({
          data: expect.objectContaining({
            auctionSessionTeamId:
              sessionTeamId,
            playerId:
              candidateId
          }),
          error: null
        });
      }
    );

    it("returns 400 for an invalid request body", async () => {
      const {
        sessionTeamId
      } = await seedScenario(
        "invalid-body"
      );

      const response =
        await app.inject({
          method: "PUT",
          url:
            `/api/auction-session-teams/${sessionTeamId}/fms-export-goalkeeper`,
          payload: {
            playerId: ""
          }
        });

      expect(response.statusCode).toBe(400);

      expect(response.json()).toEqual({
        data: null,
        error: {
          code: "INVALID_REQUEST",
          message: expect.any(String)
        }
      });
    });

    it("returns 409 when the goalkeeper real team is not allowed", async () => {
      const {
        sessionId,
        sessionTeamId
      } = await seedScenario(
        "invalid-real-team"
      );

      const candidateId =
        "goalkeeper-http-invalid-real-team-candidate";

      await db.insert(players).values({
        id: candidateId,
        auctionSessionId: sessionId,
        fmsCode: candidateId,
        name: candidateId,
        normalizedName:
          candidateId.toLocaleLowerCase("it-IT"),
        realTeamName: "Juventus",
        role: "P",
        availabilityStatus: "AVAILABLE"
      });

      const response =
        await app.inject({
          method: "PUT",
          url:
            `/api/auction-session-teams/${sessionTeamId}/fms-export-goalkeeper`,
          payload: {
            playerId: candidateId
          }
        });

      expect(response.statusCode).toBe(409);

      expect(response.json()).toEqual({
        data: null,
        error: {
          code:
            "INVALID_GOALKEEPER_REAL_TEAM",
          message: expect.any(String)
        }
      });
    });
  }
);
