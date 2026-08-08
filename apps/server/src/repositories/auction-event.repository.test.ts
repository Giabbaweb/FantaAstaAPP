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
  teams
} from "../db/schema/index.js";
import {
  SqliteAuctionEventRepository
} from "./auction-event.repository.js";

const leagueId = "league-auction-event-test";
const auctionSessionId =
  "session-auction-event-test";
const teamId = "team-auction-event-test";
const auctionSessionTeamId =
  "session-team-auction-event-test";
const playerId = "player-auction-event-test";
const auctionCallId =
  "auction-call-auction-event-test";

describe("SqliteAuctionEventRepository", () => {
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
          auctionCalls.id,
          auctionCallId
        )
      )
      .run();

    db.delete(players)
      .where(
        eq(
          players.id,
          playerId
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
      .where(
        eq(
          teams.id,
          teamId
        )
      )
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
      .where(
        eq(
          leagues.id,
          leagueId
        )
      )
      .run();
  });

  it(
    "creates and reads a confirmed auction award event",
    async () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Auction Event Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 329
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "AUDIT-001",
          name: "Audit Test Player",
          normalizedName:
            "audit test player",
          role: "A",
          availabilityStatus: "ROSTERED"
        })
        .run();

      db.insert(auctionCalls)
        .values({
          id: auctionCallId,
          auctionSessionId,
          playerId,
          callerAuctionSessionTeamId:
            auctionSessionTeamId,
          status: "CONFIRMED",
          openingBid: 1,
          currentBid: 1,
          currentLeaderAuctionSessionTeamId:
            auctionSessionTeamId,
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            auctionSessionTeamId
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      const created = db.transaction((tx) =>
        repository.createWithExecutor(
          tx,
          {
            auctionSessionId,
            auctionCallId,
            eventType:
              "AUCTION_AWARD_CONFIRMED",
            auctionSessionTeamId,
            playerId,
            amount: 1,
            creditsBefore: 330,
            creditsAfter: 329
          }
        )
      );

      expect(created).toMatchObject({
        auctionSessionId,
        auctionCallId,
        eventType:
          "AUCTION_AWARD_CONFIRMED",
        auctionSessionTeamId,
        playerId,
        amount: 1,
        creditsBefore: 330,
        creditsAfter: 329
      });

      const events =
        await repository
          .listByAuctionSessionId(
            auctionSessionId
          );

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(created);
    }
  );

  it(
    "rejects an inconsistent credit balance",
    () => {
      db.insert(leagues)
        .values({
          id: leagueId,
          name: "Auction Event Test League",
          normalizedName:
            "auction event test league"
        })
        .run();

      db.insert(auctionSessions)
        .values({
          id: auctionSessionId,
          leagueId,
          season: "2026/2027",
          editionNumber: 95,
          initialCredits: 330
        })
        .run();

      db.insert(teams)
        .values({
          id: teamId,
          leagueId,
          name: "Auction Event Test Team"
        })
        .run();

      db.insert(auctionSessionTeams)
        .values({
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId,
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 329
        })
        .run();

      db.insert(players)
        .values({
          id: playerId,
          auctionSessionId,
          fmsCode: "AUDIT-001",
          name: "Audit Test Player",
          normalizedName:
            "audit test player",
          role: "A",
          availabilityStatus: "ROSTERED"
        })
        .run();

      db.insert(auctionCalls)
        .values({
          id: auctionCallId,
          auctionSessionId,
          playerId,
          callerAuctionSessionTeamId:
            auctionSessionTeamId,
          status: "CONFIRMED",
          openingBid: 1,
          currentBid: 1,
          currentLeaderAuctionSessionTeamId:
            auctionSessionTeamId,
          currentTurnAuctionSessionTeamId:
            null,
          provisionalWinnerAuctionSessionTeamId:
            auctionSessionTeamId
        })
        .run();

      const repository =
        new SqliteAuctionEventRepository();

      expect(() =>
        db.transaction((tx) =>
          repository.createWithExecutor(
            tx,
            {
              auctionSessionId,
              auctionCallId,
              eventType:
                "AUCTION_AWARD_CONFIRMED",
              auctionSessionTeamId,
              playerId,
              amount: 10,
              creditsBefore: 100,
              creditsAfter: 95
            }
          )
        )
      ).toThrow();
    }
  );
});
