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
  auctionCalls,
  auctionSessions,
  auctionSessionTeams,
  leagues,
  players,
  teams
} from "../db/schema/index.js";
import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";

describe("SqliteCommandRegistryRepository", () => {
  const aggregate: AuctionCallAggregate = {
    call: {
      id: "auction-call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      callerAuctionSessionTeamId:
        "session-team-1",
      status: "OPEN",
      openingBid: 1,
      currentBid: 1,
      currentLeaderAuctionSessionTeamId:
        "session-team-1",
      currentTurnAuctionSessionTeamId:
        "session-team-1",
      provisionalWinnerAuctionSessionTeamId:
        null,
      createdAt:
        "2026-08-03T20:00:00.000Z",
      updatedAt:
        "2026-08-03T20:01:00.000Z"
    },
    teams: [
      {
        auctionCallId: "auction-call-1",
        auctionSessionTeamId:
          "session-team-1",
        turnOrder: 1,
        status: "ACTIVE",
        maximumBid: 307,
        exclusionReason: null
      }
    ]
  };

  let repository:
    SqliteCommandRegistryRepository;

  beforeEach(async () => {
    repository =
      new SqliteCommandRegistryRepository();

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
      initialCredits: 330,
      maximumInitialRosterEntries: 11,
      stateVersion: 1
    });

    await db.insert(teams).values({
      id: "team-1",
      leagueId: "league-1",
      name: "Team 1"
    });

    await db.insert(auctionSessionTeams).values({
      id: "session-team-1",
      auctionSessionId: "session-1",
      teamId: "team-1",
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 330
    });

    await db.insert(players).values({
      id: "player-1",
      auctionSessionId: "session-1",
      fmsCode: "001",
      name: "Player 1",
      normalizedName: "player 1",
      role: "A"
    });

    await db.insert(auctionCalls).values({
      id: "auction-call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      callerAuctionSessionTeamId:
        "session-team-1",
      status: "OPEN",
      openingBid: 1,
      currentBid: 1,
      currentLeaderAuctionSessionTeamId:
        "session-team-1",
      currentTurnAuctionSessionTeamId:
        "session-team-1"
    });
  });

  it("stores and restores a command result", async () => {
    const created = await repository.create({
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      commandId: "command-1",
      commandType: "OPEN",
      expectedStateVersion: 0,
      resultStateVersion: 1,
      requestFingerprint: "fingerprint-1",
      result: aggregate
    });

    expect(created).toMatchObject({
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      commandId: "command-1",
      commandType: "OPEN",
      expectedStateVersion: 0,
      resultStateVersion: 1,
      requestFingerprint: "fingerprint-1",
      result: aggregate
    });

    const found =
      await repository.findByCommandId(
        "session-1",
        "command-1"
      );

    expect(found).toEqual(created);
  });

  it("stores and restores a session command result", async () => {
    const result = {
      id: "session-1",
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 1,
      status: "SUSPENDED" as const,
      suspensionReason: "PIZZA_BREAK" as const,
      initialCredits: 330,
      maximumInitialRosterEntries: 11,
      createdAt:
        "2026-08-12T20:00:00.000Z",
      updatedAt:
        "2026-08-12T20:01:00.000Z"
    };

    const created =
      await repository.createSessionCommand({
        auctionSessionId: "session-1",
        commandId: "session-command-1",
        commandType: "SUSPEND_SESSION",
        expectedStateVersion: 0,
        resultStateVersion: 1,
        requestFingerprint:
          "suspend:PIZZA_BREAK",
        result
      });

    expect(created).toEqual(
      expect.objectContaining({
        auctionSessionId: "session-1",
        commandScope: "AUCTION_SESSION",
        auctionCallId: null,
        commandId: "session-command-1",
        commandType: "SUSPEND_SESSION",
        expectedStateVersion: 0,
        resultStateVersion: 1,
        requestFingerprint:
          "suspend:PIZZA_BREAK",
        result
      })
    );

    const found =
      await repository.findByCommandId(
        "session-1",
        "session-command-1"
      );

    expect(found).toEqual(created);
  });

  it(
    "stores and restores a manual initial roster command result",
    async () => {
      const result = {
        id: "roster-entry-command-result-1",
        auctionSessionTeamId:
          "session-team-1",
        playerId: "player-1",
        acquisitionCost: 25,
        contractYear: 2 as const,
        source: "INITIAL_ROSTER" as const,
        createdAt:
          "2026-08-14T20:00:00.000Z",
        updatedAt:
          "2026-08-14T20:00:00.000Z"
      };

      const created =
        await repository
          .createManualInitialRosterCommand({
            auctionSessionId:
              "session-1",
            commandId:
              "manual-roster-command-1",
            commandType:
              "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
            expectedStateVersion: 0,
            resultStateVersion: 1,
            requestFingerprint:
              "manual-roster:team-1:player-1:25:2",
            result
          });

      expect(created).toEqual(
        expect.objectContaining({
          auctionSessionId:
            "session-1",
          commandScope:
            "AUCTION_SESSION",
          auctionCallId: null,
          commandId:
            "manual-roster-command-1",
          commandType:
            "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
          expectedStateVersion: 0,
          resultStateVersion: 1,
          requestFingerprint:
            "manual-roster:team-1:player-1:25:2",
          result
        })
      );

      const found =
        await repository.findByCommandId(
          "session-1",
          "manual-roster-command-1"
        );

      expect(found).toEqual(created);
    }
  );

  it(
    "stores and restores a manual roster assignment command result",
    async () => {
      const result = {
        id:
          "roster-entry-assignment-command-result-1",
        auctionSessionTeamId:
          "session-team-1",
        playerId:
          "player-1",
        acquisitionCost: 30,
        contractYear: 3 as const,
        source:
          "MANUAL_ASSIGNMENT" as const,
        createdAt:
          "2026-08-14T21:00:00.000Z",
        updatedAt:
          "2026-08-14T21:00:00.000Z"
      };

      const created =
        await repository
          .createManualRosterAssignmentCommand({
            auctionSessionId:
              "session-1",
            commandId:
              "manual-assignment-command-1",
            commandType:
              "ADD_MANUAL_ROSTER_ASSIGNMENT",
            expectedStateVersion: 1,
            resultStateVersion: 2,
            requestFingerprint:
              "manual-assignment:team-1:player-1:30:3",
            result
          });

      expect(created).toEqual(
        expect.objectContaining({
          auctionSessionId:
            "session-1",
          commandScope:
            "AUCTION_SESSION",
          auctionCallId: null,
          commandId:
            "manual-assignment-command-1",
          commandType:
            "ADD_MANUAL_ROSTER_ASSIGNMENT",
          expectedStateVersion: 1,
          resultStateVersion: 2,
          requestFingerprint:
            "manual-assignment:team-1:player-1:30:3",
          result
        })
      );

      const found =
        await repository.findByCommandId(
          "session-1",
          "manual-assignment-command-1"
        );

      expect(found).toEqual(created);
    }
  );

  it(
    "stores and restores a technical roster correction command result",
    async () => {
      const result = {
        id:
          "roster-entry-technical-correction-command-result-1",
        auctionSessionTeamId:
          "session-team-1",
        playerId:
          "player-1",
        acquisitionCost: 35,
        contractYear: 3 as const,
        source:
          "TECHNICAL_CORRECTION" as const,
        createdAt:
          "2026-08-15T20:00:00.000Z",
        updatedAt:
          "2026-08-15T20:05:00.000Z"
      };

      const created =
        await repository
          .createTechnicalRosterCorrectionCommand({
            auctionSessionId:
              "session-1",
            commandId:
              "technical-correction-command-1",
            commandType:
              "TECHNICAL_ROSTER_CORRECTION",
            expectedStateVersion: 2,
            resultStateVersion: 3,
            requestFingerprint:
              "technical-correction:roster-entry-1:team-1:player-1:35:3",
            result
          });

      expect(created).toEqual(
        expect.objectContaining({
          auctionSessionId:
            "session-1",
          commandScope:
            "AUCTION_SESSION",
          auctionCallId: null,
          commandId:
            "technical-correction-command-1",
          commandType:
            "TECHNICAL_ROSTER_CORRECTION",
          expectedStateVersion: 2,
          resultStateVersion: 3,
          requestFingerprint:
            "technical-correction:roster-entry-1:team-1:player-1:35:3",
          result
        })
      );

      const found =
        await repository.findByCommandId(
          "session-1",
          "technical-correction-command-1"
        );

      expect(found).toEqual(created);
    }
  );

  it("returns null for an unknown command", async () => {
    await expect(
      repository.findByCommandId(
        "session-1",
        "missing-command"
      )
    ).resolves.toBeNull();
  });

  it("rejects a duplicate command within the same session", async () => {
    const input = {
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      commandId: "command-1",
      commandType: "OPEN" as const,
      expectedStateVersion: 0,
      resultStateVersion: 1,
      requestFingerprint: "fingerprint-1",
      result: aggregate
    };

    await repository.create(input);

    await expect(
      repository.create(input)
    ).rejects.toThrow();
  });
});
