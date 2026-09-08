import {
  afterAll,
  beforeAll,
  beforeEach,
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
  leagues,
  teams
} from "../db/schema/index.js";
import {
  SqliteTeamAccessRepository
} from "../realtime/team-access.repository.js";
import {
  TeamAccessService
} from "../realtime/team-access.service.js";

describe("team access routes", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  const auctionSessionTeamId =
    "team-access-route-session-team";

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.insert(leagues).values({
      id: "team-access-route-league",
      name: "Team Access Route League",
      normalizedName:
        "team access route league"
    });

    await db.insert(auctionSessions).values({
      id: "team-access-route-session",
      leagueId:
        "team-access-route-league",
      season: "2026/2027",
      editionNumber: 1,
      initialCredits: 300
    });

    await db.insert(teams).values({
      id: "team-access-route-team",
      leagueId:
        "team-access-route-league",
      name: "Team Access Route Team"
    });

    await db
      .insert(auctionSessionTeams)
      .values({
        id: auctionSessionTeamId,
        auctionSessionId:
          "team-access-route-session",
        teamId:
          "team-access-route-team",
        tableOrder: 1,
        renewalCredits: 0,
        remainingCredits: 300
      });

    const service =
      new TeamAccessService(
        new SqliteTeamAccessRepository()
      );

    await service.setAccessPin(
      auctionSessionTeamId,
      "1111"
    );
  });

  it("verifies the configured PIN", async () => {
    const response = await app.inject({
      method: "POST",
      url:
        `/api/auction-session-teams/${auctionSessionTeamId}/access-pin/verify`,
      payload: {
        pin: "1111"
      }
    });

    expect(response.statusCode).toBe(200);

    expect(response.json()).toEqual({
      data: {
        valid: true
      },
      error: null
    });
  });

  it("returns false for an incorrect PIN", async () => {
    const response = await app.inject({
      method: "POST",
      url:
        `/api/auction-session-teams/${auctionSessionTeamId}/access-pin/verify`,
      payload: {
        pin: "9999"
      }
    });

    expect(response.statusCode).toBe(200);

    expect(response.json()).toEqual({
      data: {
        valid: false
      },
      error: null
    });
  });

  it("rejects an invalid PIN format", async () => {
    const response = await app.inject({
      method: "POST",
      url:
        `/api/auction-session-teams/${auctionSessionTeamId}/access-pin/verify`,
      payload: {
        pin: "123"
      }
    });

    expect(response.statusCode).toBe(400);

    expect(
      response.json()
    ).toMatchObject({
      data: null,
      error: {
        code: "INVALID_REQUEST"
      }
    });
  });
});
