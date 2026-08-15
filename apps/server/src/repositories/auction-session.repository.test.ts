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
  auctionSessions,
  leagues
} from "../db/schema/index.js";
import {
  SqliteAuctionSessionRepository
} from "./auction-session.repository.js";

describe("SqliteAuctionSessionRepository", () => {
  const auctionSessionId = "session-repository-1";

  let repository:
    SqliteAuctionSessionRepository;

  beforeEach(async () => {
    repository =
      new SqliteAuctionSessionRepository();

    await db.insert(leagues).values({
      id: "league-repository-1",
      name: "League Repository 1",
      normalizedName:
        "league repository 1"
    });

    await db.insert(auctionSessions).values({
      id: auctionSessionId,
      leagueId: "league-repository-1",
      season: "2026/2027",
      editionNumber: 1,
      status: "SUSPENDED",
      suspensionReason: "PIZZA_BREAK",
      initialCredits: 330,
      stateVersion: 7
    });
  });

  it("reads an auction session with the supplied executor", () => {
    const session =
      repository.findByIdWithExecutor(
        db,
        auctionSessionId
      );

    expect(session).toEqual({
      id: auctionSessionId,
      leagueId: "league-repository-1",
      season: "2026/2027",
      editionNumber: 1,
      status: "SUSPENDED",
      suspensionReason: "PIZZA_BREAK",
      initialCredits: 330,
      maximumInitialRosterEntries: 11,
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });

    expect(session).not.toHaveProperty(
      "stateVersion"
    );
  });
});
