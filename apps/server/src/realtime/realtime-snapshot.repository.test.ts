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
  players,
  rosterEntries,
  teams
} from "../db/schema/index.js";

import {
  SqliteRealtimePublicDisplayReader,
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

  it("returns public display team data with roster role counts", async () => {
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

    await db.insert(teams).values([
      {
        id: "team-1",
        leagueId: "league-1",
        name: "Team One",
        shortName: "ONE",
        primaryColor: "#112233",
        secondaryColor: "#ffffff",
        logoPath: "/logos/team-1.png"
      },
      {
        id: "team-2",
        leagueId: "league-1",
        name: "Team Two"
      }
    ]);

    await db.insert(auctionSessionTeams).values([
      {
        id: "auction-session-team-1",
        auctionSessionId: "session-1",
        teamId: "team-1",
        tableOrder: 2,
        renewalCredits: 20,
        remainingCredits: 280
      },
      {
        id: "auction-session-team-2",
        auctionSessionId: "session-1",
        teamId: "team-2",
        tableOrder: 1,
        renewalCredits: 0,
        remainingCredits: 330
      }
    ]);

    await db.insert(players).values([
      {
        id: "player-p",
        auctionSessionId: "session-1",
        fmsCode: "P001",
        name: "Portiere One",
        normalizedName: "portiere one",
        role: "P",
        availabilityStatus: "ROSTERED"
      },
      {
        id: "player-d",
        auctionSessionId: "session-1",
        fmsCode: "D001",
        name: "Difensore One",
        normalizedName: "difensore one",
        role: "D",
        availabilityStatus: "ROSTERED"
      },
      {
        id: "player-c",
        auctionSessionId: "session-1",
        fmsCode: "C001",
        name: "Centrocampista One",
        normalizedName: "centrocampista one",
        role: "C",
        availabilityStatus: "ROSTERED"
      },
      {
        id: "player-a",
        auctionSessionId: "session-1",
        fmsCode: "A001",
        name: "Attaccante One",
        normalizedName: "attaccante one",
        role: "A",
        availabilityStatus: "ROSTERED"
      }
    ]);

    await db.insert(rosterEntries).values([
      {
        id: "roster-entry-p",
        auctionSessionTeamId:
          "auction-session-team-1",
        playerId: "player-p",
        acquisitionCost: 10,
        contractYear: 1,
        source: "INITIAL_ROSTER"
      },
      {
        id: "roster-entry-d",
        auctionSessionTeamId:
          "auction-session-team-1",
        playerId: "player-d",
        acquisitionCost: 5,
        contractYear: 1,
        source: "INITIAL_ROSTER"
      },
      {
        id: "roster-entry-c",
        auctionSessionTeamId:
          "auction-session-team-1",
        playerId: "player-c",
        acquisitionCost: 7,
        contractYear: 1,
        source: "INITIAL_ROSTER"
      },
      {
        id: "roster-entry-a",
        auctionSessionTeamId:
          "auction-session-team-1",
        playerId: "player-a",
        acquisitionCost: 8,
        contractYear: 1,
        source: "INITIAL_ROSTER"
      }
    ]);

    const reader =
      new SqliteRealtimePublicDisplayReader();

    await expect(
      reader.findTeamsByAuctionSessionId(
        "session-1"
      )
    ).resolves.toEqual([
      {
        auctionSessionTeamId:
          "auction-session-team-2",
        teamId: "team-2",
        teamName: "Team Two",
        shortName: null,
        primaryColor: null,
        secondaryColor: null,
        logoPath: null,
        tableOrder: 1,
        remainingCredits: 330,
        roleCounts: {
          P: 0,
          D: 0,
          C: 0,
          A: 0
        }
      },
      {
        auctionSessionTeamId:
          "auction-session-team-1",
        teamId: "team-1",
        teamName: "Team One",
        shortName: "ONE",
        primaryColor: "#112233",
        secondaryColor: "#ffffff",
        logoPath: "/logos/team-1.png",
        tableOrder: 2,
        remainingCredits: 280,
        roleCounts: {
          P: 1,
          D: 1,
          C: 1,
          A: 1
        }
      }
    ]);
  });
  it("returns public display player data", async () => {
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

    await db.insert(players).values({
      id: "player-1",
      auctionSessionId: "session-1",
      fmsCode: "A001",
      name: "Attaccante One",
      normalizedName: "attaccante one",
      role: "A",
      availabilityStatus: "AVAILABLE"
    });

    const reader =
      new SqliteRealtimePublicDisplayReader();

    await expect(
      reader.findPlayerById("player-1")
    ).resolves.toEqual({
      id: "player-1",
      name: "Attaccante One",
      role: "A"
    });
  });

  it("returns null for a missing public display player", async () => {
    const reader =
      new SqliteRealtimePublicDisplayReader();

    await expect(
      reader.findPlayerById("missing-player")
    ).resolves.toBeNull();
  });
});
