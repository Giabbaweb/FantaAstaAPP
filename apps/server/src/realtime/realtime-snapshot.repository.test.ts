import {
  describe,
  expect,
  it
} from "vitest";

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
  SqliteRealtimeSnapshotSessionReader,
  SqliteRealtimeSnapshotTeamReader
} from "./realtime-snapshot.repository.js";

describe("realtime snapshot SQLite readers", () => {
  it("returns the public session and its state version", async () => {
    await db.insert(leagues).values({
      id: "league-1",
      name: "League 1",
      normalizedName: "league 1"
    });

    await db.insert(auctionSessions).values({
      id: "session-1",
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 35,
      initialCredits: 330,
      stateVersion: 7
    });

    const reader =
      new SqliteRealtimeSnapshotSessionReader();

    const result =
      await reader.findById("session-1");

    expect(result).toEqual({
      stateVersion: 7,
      session: {
        id: "session-1",
        leagueId: "league-1",
        season: "2026/2027",
        editionNumber: 35,
        status: "SETUP",
        initialCredits: 330,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    });

    expect(result?.session).not.toHaveProperty(
      "stateVersion"
    );
  });

  it("returns null for a missing session", async () => {
    const reader =
      new SqliteRealtimeSnapshotSessionReader();

    await expect(
      reader.findById("missing-session")
    ).resolves.toBeNull();
  });

  it("returns session teams with participation ids and without credentials", async () => {
    await db.insert(leagues).values({
      id: "league-1",
      name: "League 1",
      normalizedName: "league 1"
    });

    await db.insert(auctionSessions).values({
      id: "session-1",
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 35,
      initialCredits: 330
    });

    await db.insert(teams).values({
      id: "team-1",
      leagueId: "league-1",
      name: "Team 1"
    });

    await db.insert(auctionSessionTeams).values({
      id: "auction-session-team-1",
      auctionSessionId: "session-1",
      teamId: "team-1",
      tableOrder: 1,
      renewalCredits: 20,
      remainingCredits: 310,
      accessPinHash:
        "scrypt$private$credential"
    });

    const reader =
      new SqliteRealtimeSnapshotTeamReader();

    const result =
      await reader.findByAuctionSessionId(
        "session-1"
      );

    expect(result).toEqual([
      {
        id: "auction-session-team-1",
        auctionSessionId: "session-1",
        teamId: "team-1",
        tableOrder: 1,
        renewalCredits: 20,
        remainingCredits: 310
      }
    ]);

    expect(result[0]).not.toHaveProperty(
      "accessPinHash"
    );
  });
});
