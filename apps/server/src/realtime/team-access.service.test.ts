import {
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  SqliteAuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";
import {
  auctionSessions,
  auctionSessionTeams,
  leagues,
  teams
} from "../db/schema/index.js";
import {
  SqliteTeamAccessRepository
} from "./team-access.repository.js";
import {
  TeamAccessService
} from "./team-access.service.js";

describe("TeamAccessService", () => {
  const auctionSessionTeamId =
    "auction-session-team-1";

  let repository:
    SqliteTeamAccessRepository;

  let service:
    TeamAccessService;

  beforeEach(async () => {
    repository =
      new SqliteTeamAccessRepository();

    service =
      new TeamAccessService(repository);

    await db.insert(leagues).values({
      id: "league-1",
      name: "League 1",
      normalizedName: "league 1"
    });

    await db.insert(auctionSessions).values({
      id: "session-1",
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 1,
      initialCredits: 330
    });

    await db.insert(teams).values({
      id: "team-1",
      leagueId: "league-1",
      name: "Team 1"
    });

    await db.insert(auctionSessionTeams).values({
      id: auctionSessionTeamId,
      auctionSessionId: "session-1",
      teamId: "team-1",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 330
    });
  });

  it("stores the PIN as a hash", async () => {
    await service.setAccessPin(
      auctionSessionTeamId,
      "1234"
    );

    const credential =
      await repository
        .findByAuctionSessionTeamId(
          auctionSessionTeamId
        );

    expect(credential).toEqual({
      auctionSessionTeamId,
      auctionSessionId: "session-1",
      accessPinHash: expect.stringMatching(
        /^scrypt\$/
      )
    });

    expect(
      credential?.accessPinHash
    ).not.toContain("1234");
  });

  it("verifies the configured PIN", async () => {
    await service.setAccessPin(
      auctionSessionTeamId,
      "1234"
    );

    await expect(
      service.verifyAccessPin(
        auctionSessionTeamId,
        "1234"
      )
    ).resolves.toBe(true);

    await expect(
      service.verifyAccessPin(
        auctionSessionTeamId,
        "9999"
      )
    ).resolves.toBe(false);
  });

  it("rejects an unknown auction session team", async () => {
    await expect(
      service.setAccessPin(
        "missing-session-team",
        "1234"
      )
    ).rejects.toMatchObject({
      code: "TEAM_ACCESS_NOT_FOUND"
    });
  });

  it("rejects verification when the PIN is not configured", async () => {
    await expect(
      service.verifyAccessPin(
        auctionSessionTeamId,
        "1234"
      )
    ).rejects.toMatchObject({
      code: "TEAM_ACCESS_PIN_NOT_CONFIGURED"
    });
  });

  it("does not expose the PIN hash through the public team repository", async () => {
    await service.setAccessPin(
      auctionSessionTeamId,
      "1234"
    );

    const publicRepository =
      new SqliteAuctionSessionTeamRepository();

    const sessionTeam =
      await publicRepository.findOne(
        "session-1",
        "team-1"
      );

    expect(sessionTeam).not.toBeNull();
    expect(sessionTeam).not.toHaveProperty(
      "accessPinHash"
    );
  });
});
