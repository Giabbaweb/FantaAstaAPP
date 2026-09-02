import {
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionCalls,
  auctionEvents,
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
      maximumInitialRosterEntries: 11,
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
        suspensionReason: null,
        initialCredits: 330,
        maximumInitialRosterEntries: 11,
        remoteBaseUrl: null,
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
        },
        rosterEntries: []
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
        },
        rosterEntries: [
          {
            rosterEntryId: "roster-entry-p",
            playerId: "player-p",
            playerName: "Portiere One",
            realTeamName: null,
            role: "P",
            acquisitionCost: 10
          },
          {
            rosterEntryId: "roster-entry-d",
            playerId: "player-d",
            playerName: "Difensore One",
            realTeamName: null,
            role: "D",
            acquisitionCost: 5
          },
          {
            rosterEntryId: "roster-entry-c",
            playerId: "player-c",
            playerName: "Centrocampista One",
            realTeamName: null,
            role: "C",
            acquisitionCost: 7
          },
          {
            rosterEntryId: "roster-entry-a",
            playerId: "player-a",
            playerName: "Attaccante One",
            realTeamName: null,
            role: "A",
            acquisitionCost: 8
          }
        ]
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
      fmsCode: "A001",
      name: "Attaccante One",
      realTeamName: null,
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

  it(
    "returns only currently effective auction awards and keeps only the latest award per player",
    async () => {
      await db.insert(leagues).values({
        id: "league-awards",
        name: "League Awards",
        normalizedName:
          "league awards"
      });

      await db.insert(auctionSessions).values({
        id: "session-awards",
        leagueId: "league-awards",
        season: "2026/2027",
        editionNumber: 35,
        initialCredits: 300
      });

      await db.insert(teams).values({
        id: "team-awards",
        leagueId: "league-awards",
        name: "Team Awards"
      });

      await db.insert(auctionSessionTeams)
        .values({
          id: "session-team-awards",
          auctionSessionId:
            "session-awards",
          teamId: "team-awards",
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 280
        });

      await db.insert(players).values([
        {
          id: "player-current-award",
          auctionSessionId:
            "session-awards",
          fmsCode: "AWARD-001",
          name: "Current Award",
          normalizedName:
            "current award",
          role: "A",
          availabilityStatus:
            "ROSTERED"
        },
        {
          id: "player-removed-award",
          auctionSessionId:
            "session-awards",
          fmsCode: "AWARD-002",
          name: "Removed Award",
          normalizedName:
            "removed award",
          role: "A",
          availabilityStatus:
            "AVAILABLE"
        }
      ]);

      await db.insert(rosterEntries).values({
        id: "roster-current-award",
        auctionSessionTeamId:
          "session-team-awards",
        playerId:
          "player-current-award",
        acquisitionCost: 20,
        contractYear: 1,
        source: "AUCTION"
      });

      await db.insert(auctionCalls).values([
        {
          id: "call-current-old",
          auctionSessionId:
            "session-awards",
          playerId:
            "player-current-award",
          callerAuctionSessionTeamId:
            "session-team-awards",
          status: "CONFIRMED",
          openingBid: 1,
          currentBid: 20,
          currentLeaderAuctionSessionTeamId:
            "session-team-awards",
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            "session-team-awards"
        },
        {
          id: "call-current-new",
          auctionSessionId:
            "session-awards",
          playerId:
            "player-current-award",
          callerAuctionSessionTeamId:
            "session-team-awards",
          status: "CONFIRMED",
          openingBid: 1,
          currentBid: 20,
          currentLeaderAuctionSessionTeamId:
            "session-team-awards",
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            "session-team-awards"
        },
        {
          id: "call-removed",
          auctionSessionId:
            "session-awards",
          playerId:
            "player-removed-award",
          callerAuctionSessionTeamId:
            "session-team-awards",
          status: "CONFIRMED",
          openingBid: 1,
          currentBid: 11,
          currentLeaderAuctionSessionTeamId:
            "session-team-awards",
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            "session-team-awards"
        }
      ]);

      await db.insert(auctionEvents).values([
        {
          id: "award-current-old",
          auctionSessionId:
            "session-awards",
          auctionCallId:
            "call-current-old",
          eventType:
            "AUCTION_AWARD_CONFIRMED",
          auctionSessionTeamId:
            "session-team-awards",
          playerId:
            "player-current-award",
          amount: 20,
          creditsBefore: 300,
          creditsAfter: 280,
          createdAt:
            "2026-09-16 20:00:00"
        },
        {
          id: "award-current-new",
          auctionSessionId:
            "session-awards",
          auctionCallId:
            "call-current-new",
          eventType:
            "AUCTION_AWARD_CONFIRMED",
          auctionSessionTeamId:
            "session-team-awards",
          playerId:
            "player-current-award",
          amount: 20,
          creditsBefore: 300,
          creditsAfter: 280,
          createdAt:
            "2026-09-16 21:00:00"
        },
        {
          id: "award-removed",
          auctionSessionId:
            "session-awards",
          auctionCallId:
            "call-removed",
          eventType:
            "AUCTION_AWARD_CONFIRMED",
          auctionSessionTeamId:
            "session-team-awards",
          playerId:
            "player-removed-award",
          amount: 11,
          creditsBefore: 291,
          creditsAfter: 280,
          createdAt:
            "2026-09-16 22:00:00"
        }
      ]);

      const reader =
        new SqliteRealtimePublicDisplayReader();

      await expect(
        reader.findRecentAwardsByAuctionSessionId(
          "session-awards"
        )
      ).resolves.toEqual([
        expect.objectContaining({
          eventId:
            "award-current-new",
          playerId:
            "player-current-award",
          playerName:
            "Current Award",
          auctionSessionTeamId:
            "session-team-awards",
          teamName:
            "Team Awards",
          amount: 20
        })
      ]);
    }
  );
});
