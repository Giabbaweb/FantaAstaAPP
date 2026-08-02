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
  SqliteRealtimeSnapshotTeamReader
} from "./realtime-snapshot.repository.js";

describe("SqliteRealtimeSnapshotTeamReader", () => {
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
