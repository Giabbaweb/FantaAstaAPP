import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
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
  SqliteAuctionEventRepository
} from "../repositories/auction-event.repository.js";
import {
  SqliteAuctionSessionTeamRepository
} from "../repositories/auction-session-team.repository.js";
import {
  SqlitePlayerRepository
} from "../repositories/player.repository.js";
import {
  SqliteRosterEntryRepository
} from "../repositories/roster-entry.repository.js";
import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import {
  ConfirmedAuctionAwardService
} from "./confirmed-auction-award.service.js";

const leagueId =
  "league-confirmed-award-service-test";
const auctionSessionId =
  "session-confirmed-award-service-test";
const teamId =
  "team-confirmed-award-service-test";
const auctionSessionTeamId =
  "session-team-confirmed-award-service-test";
const playerId =
  "player-confirmed-award-service-test";

describe("ConfirmedAuctionAwardService", () => {
  afterEach(() => {
    db.delete(auctionEvents)
      .where(
        eq(
          auctionEvents.auctionSessionId,
          auctionSessionId
        )
      )
      .run();

    db.delete(auctionCalls)
      .where(
        eq(
          auctionCalls.auctionSessionId,
          auctionSessionId
        )
      )
      .run();

    db.delete(rosterEntries)
      .where(
        eq(
          rosterEntries.auctionSessionTeamId,
          auctionSessionTeamId
        )
      )
      .run();

    db.delete(players)
      .where(
        eq(
          players.auctionSessionId,
          auctionSessionId
        )
      )
      .run();

    db.delete(auctionSessionTeams)
      .where(
        eq(
          auctionSessionTeams.id,
          auctionSessionTeamId
        )
      )
      .run();

    db.delete(teams)
      .where(eq(teams.id, teamId))
      .run();

    db.delete(auctionSessions)
      .where(
        eq(
          auctionSessions.id,
          auctionSessionId
        )
      )
      .run();

    db.delete(leagues)
      .where(eq(leagues.id, leagueId))
      .run();
  });

  it(
    "persists the confirmed auction award inside a transaction",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Confirmed Award Test League",
          normalizedName:
            "confirmed award test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 96,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Confirmed Award Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 100
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "CONFIRMED-AWARD-001",
          name: "Confirmed Award Player",
          normalizedName:
            "confirmed award player",
          role: "A",
          availabilityStatus: "AVAILABLE"
        })
        .run();

      const aggregate: AuctionCallAggregate = {
        call: {
          id: "auction-call-confirmed-award-test",
          auctionSessionId,
          playerId,
          callerAuctionSessionTeamId:
            auctionSessionTeamId,
          status: "PROVISIONAL_AWARD",
          openingBid: 1,
          currentBid: 25,
          currentLeaderAuctionSessionTeamId:
            auctionSessionTeamId,
          currentTurnAuctionSessionTeamId:
            null,
          currentTurnStartedAt: null,
          provisionalWinnerAuctionSessionTeamId:
            auctionSessionTeamId,
          createdAt:
            "2026-08-08T20:00:00.000Z",
          updatedAt:
            "2026-08-08T20:01:00.000Z"
        },
        teams: []
      };

      db.insert(auctionCalls)
        .values({
          ...aggregate.call
        })
        .run();

      const service =
        new ConfirmedAuctionAwardService(
          new SqliteAuctionSessionTeamRepository(),
          new SqliteRosterEntryRepository(),
          new SqlitePlayerRepository(),
          new SqliteAuctionEventRepository()
        );

      db.transaction((tx) => {
        service.apply(
          tx,
          aggregate
        );
      });

      const storedRosterEntry = db
        .select()
        .from(rosterEntries)
        .where(
          eq(
            rosterEntries.playerId,
            playerId
          )
        )
        .get();

      expect(storedRosterEntry).toMatchObject({
        auctionSessionTeamId,
        playerId,
        acquisitionCost: 25,
        contractYear: 1,
        source: "AUCTION"
      });

      const storedPlayer = db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .get();

      expect(
        storedPlayer?.availabilityStatus
      ).toBe("ROSTERED");

      const storedSessionTeam = db
        .select()
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.id,
            auctionSessionTeamId
          )
        )
        .get();

      expect(
        storedSessionTeam?.remainingCredits
      ).toBe(75);
      const storedEvents = db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionCallId,
            aggregate.call.id
          )
        )
        .all();

      expect(storedEvents).toHaveLength(1);

      expect(storedEvents[0]).toMatchObject({
        auctionSessionId,
        auctionCallId:
          aggregate.call.id,
        eventType:
          "AUCTION_AWARD_CONFIRMED",
        auctionSessionTeamId,
        playerId,
        amount: 25,
        creditsBefore: 100,
        creditsAfter: 75
      });
    }
  );

  it(
    "leaves no partial changes when the player is not available",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Confirmed Award Test League",
          normalizedName:
            "confirmed award test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 96,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Confirmed Award Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 100
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "CONFIRMED-AWARD-001",
          name: "Confirmed Award Player",
          normalizedName:
            "confirmed award player",
          role: "A",
          availabilityStatus: "ROSTERED"
        })
        .run();

      const aggregate: AuctionCallAggregate = {
        call: {
          id: "auction-call-confirmed-award-test",
          auctionSessionId,
          playerId,
          callerAuctionSessionTeamId:
            auctionSessionTeamId,
          status: "PROVISIONAL_AWARD",
          openingBid: 1,
          currentBid: 25,
          currentLeaderAuctionSessionTeamId:
            auctionSessionTeamId,
          currentTurnAuctionSessionTeamId:
            null,
          currentTurnStartedAt: null,
          provisionalWinnerAuctionSessionTeamId:
            auctionSessionTeamId,
          createdAt:
            "2026-08-08T20:00:00.000Z",
          updatedAt:
            "2026-08-08T20:01:00.000Z"
        },
        teams: []
      };

      db.insert(auctionCalls)
        .values({
          ...aggregate.call
        })
        .run();

      const service =
        new ConfirmedAuctionAwardService(
          new SqliteAuctionSessionTeamRepository(),
          new SqliteRosterEntryRepository(),
          new SqlitePlayerRepository(),
          new SqliteAuctionEventRepository()
        );

      expect(() =>
        db.transaction((tx) => {
          service.apply(
            tx,
            aggregate
          );
        })
      ).toThrowError(
        expect.objectContaining({
          code: "PLAYER_NOT_AVAILABLE"
        })
      );

      const storedRosterEntries = db
        .select()
        .from(rosterEntries)
        .where(
          eq(
            rosterEntries.playerId,
            playerId
          )
        )
        .all();

      expect(storedRosterEntries).toHaveLength(0);

      const storedPlayer = db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .get();

      expect(
        storedPlayer?.availabilityStatus
      ).toBe("ROSTERED");

      const storedSessionTeam = db
        .select()
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.id,
            auctionSessionTeamId
          )
        )
        .get();

      expect(
        storedSessionTeam?.remainingCredits
      ).toBe(100);
      const storedEvents = db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionCallId,
            aggregate.call.id
          )
        )
        .all();

      expect(storedEvents).toHaveLength(0);
    }
  );

  it(
    "rolls back when the acquisition is not economically sustainable",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Confirmed Award Test League",
          normalizedName:
            "confirmed award test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 96,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Confirmed Award Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 20
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "CONFIRMED-AWARD-001",
          name: "Confirmed Award Player",
          normalizedName:
            "confirmed award player",
          role: "A",
          availabilityStatus: "AVAILABLE"
        })
        .run();

      for (let index = 0; index < 14; index += 1) {
        const rosterPlayerId =
          `confirmed-award-roster-player-${index}`;

        db.insert(players)
          .values({
            id: rosterPlayerId,
            auctionSessionId,
            fmsCode:
              `CONFIRMED-AWARD-ROSTER-${index}`,
            name:
              `Confirmed Award Roster Player ${index}`,
            normalizedName:
              `confirmed award roster player ${index}`,
            role: index < 3 ? "A" : "D",
            availabilityStatus: "ROSTERED"
          })
          .run();

        db.insert(rosterEntries)
          .values({
            id:
              `confirmed-award-roster-entry-${index}`,
            auctionSessionTeamId,
            playerId: rosterPlayerId,
            acquisitionCost: 1,
            contractYear: 1,
            source: "INITIAL_ROSTER"
          })
          .run();
      }

      const aggregate: AuctionCallAggregate = {
        call: {
          id: "auction-call-confirmed-award-test",
          auctionSessionId,
          playerId,
          callerAuctionSessionTeamId:
            auctionSessionTeamId,
          status: "PROVISIONAL_AWARD",
          openingBid: 1,
          currentBid: 12,
          currentLeaderAuctionSessionTeamId:
            auctionSessionTeamId,
          currentTurnAuctionSessionTeamId:
            null,
          currentTurnStartedAt: null,
          provisionalWinnerAuctionSessionTeamId:
            auctionSessionTeamId,
          createdAt:
            "2026-08-08T20:00:00.000Z",
          updatedAt:
            "2026-08-08T20:01:00.000Z"
        },
        teams: []
      };

      db.insert(auctionCalls)
        .values({
          ...aggregate.call
        })
        .run();

      const service =
        new ConfirmedAuctionAwardService(
          new SqliteAuctionSessionTeamRepository(),
          new SqliteRosterEntryRepository(),
          new SqlitePlayerRepository(),
          new SqliteAuctionEventRepository()
        );

      expect(() =>
        db.transaction((tx) => {
          service.apply(
            tx,
            aggregate
          );
        })
      ).toThrowError(
        expect.objectContaining({
          code:
            "INSUFFICIENT_CREDITS_TO_COMPLETE_ROSTER"
        })
      );

      const storedAward = db
        .select()
        .from(rosterEntries)
        .where(
          eq(
            rosterEntries.playerId,
            playerId
          )
        )
        .all();

      expect(storedAward).toHaveLength(0);

      const storedPlayer = db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .get();

      expect(
        storedPlayer?.availabilityStatus
      ).toBe("AVAILABLE");

      const storedSessionTeam = db
        .select()
        .from(auctionSessionTeams)
        .where(
          eq(
            auctionSessionTeams.id,
            auctionSessionTeamId
          )
        )
        .get();

      expect(
        storedSessionTeam?.remainingCredits
      ).toBe(20);
      const storedEvents = db
        .select()
        .from(auctionEvents)
        .where(
          eq(
            auctionEvents.auctionCallId,
            aggregate.call.id
          )
        )
        .all();

      expect(storedEvents).toHaveLength(0);
    }
  );

});
