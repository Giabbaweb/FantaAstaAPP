import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  eq
} from "drizzle-orm";

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
  teams
} from "../db/schema/index.js";
import {
  resetTestDatabase
} from "../test/database.js";
import {
  SqliteAuctionEventRepository
} from "./auction-event.repository.js";
import {
  SqliteAdminActivityRepository
} from "./admin-activity.repository.js";

const leagueId =
  "league-admin-activity-test";

const auctionSessionId =
  "session-admin-activity-test";

const team1Id =
  "team-admin-activity-1";

const team2Id =
  "team-admin-activity-2";

const sessionTeam1Id =
  "session-team-admin-activity-1";

const sessionTeam2Id =
  "session-team-admin-activity-2";

const player1Id =
  "player-admin-activity-1";

const player2Id =
  "player-admin-activity-2";

const auctionCallId =
  "auction-call-admin-activity";

function createFixture(): void {
  db.insert(leagues)
    .values({
      id: leagueId,
      name: "Admin Activity League",
      normalizedName:
        "admin activity league"
    })
    .run();

  db.insert(auctionSessions)
    .values({
      id: auctionSessionId,
      leagueId,
      season: "2026/2027",
      editionNumber: 35,
      initialCredits: 300
    })
    .run();

  db.insert(teams)
    .values([
      {
        id: team1Id,
        leagueId,
        name: "Atletico Milano"
      },
      {
        id: team2Id,
        leagueId,
        name: "Dinamo Porta Romana"
      }
    ])
    .run();

  db.insert(auctionSessionTeams)
    .values([
      {
        id: sessionTeam1Id,
        auctionSessionId,
        teamId: team1Id,
        tableOrder: 1,
        renewalCredits: 0,
        remainingCredits: 250
      },
      {
        id: sessionTeam2Id,
        auctionSessionId,
        teamId: team2Id,
        tableOrder: 2,
        renewalCredits: 0,
        remainingCredits: 220
      }
    ])
    .run();

  db.insert(players)
    .values([
      {
        id: player1Id,
        auctionSessionId,
        fmsCode: "ADMIN-ACTIVITY-001",
        name: "Lautaro Martinez",
        normalizedName:
          "lautaro martinez",
        realTeamName: "Inter",
        role: "A",
        availabilityStatus: "ROSTERED"
      },
      {
        id: player2Id,
        auctionSessionId,
        fmsCode: "ADMIN-ACTIVITY-002",
        name: "Marcus Thuram",
        normalizedName:
          "marcus thuram",
        realTeamName: "Inter",
        role: "A",
        availabilityStatus: "ROSTERED"
      }
    ])
    .run();

  db.insert(auctionCalls)
    .values({
      id: auctionCallId,
      auctionSessionId,
      playerId: player1Id,
      callerAuctionSessionTeamId:
        sessionTeam1Id,
      status: "CONFIRMED",
      openingBid: 1,
      currentBid: 47,
      currentLeaderAuctionSessionTeamId:
        sessionTeam2Id,
      currentTurnAuctionSessionTeamId:
        null,
      provisionalWinnerAuctionSessionTeamId:
        sessionTeam2Id
    })
    .run();
}

describe(
  "SqliteAdminActivityRepository",
  () => {
    beforeEach(() => {
      resetTestDatabase();
      createFixture();
    });

    afterEach(() => {
      resetTestDatabase();
    });

    it(
      "projects recent auction activity with readable names",
      async () => {
        const eventRepository =
          new SqliteAuctionEventRepository();

        const award =
          db.transaction((tx) =>
            eventRepository.createWithExecutor(
              tx,
              {
                auctionSessionId,
                auctionCallId,
                eventType:
                  "AUCTION_AWARD_CONFIRMED",
                auctionSessionTeamId:
                  sessionTeam2Id,
                playerId: player1Id,
                amount: 47,
                creditsBefore: 267,
                creditsAfter: 220
              }
            )
          );

        const suspension =
          db.transaction((tx) =>
            eventRepository.createWithExecutor(
              tx,
              {
                auctionSessionId,
                eventType:
                  "SESSION_SUSPENDED",
                suspensionReason:
                  "PIZZA_BREAK"
              }
            )
          );

        const correction =
          db.transaction((tx) =>
            eventRepository.createWithExecutor(
              tx,
              {
                auctionSessionId,
                eventType:
                  "TECHNICAL_ROSTER_CORRECTION",
                actorName: "Gianfranco",
                actorRole:
                  "ADMINISTRATOR",
                comment:
                  "Corretto giocatore e costo",
                beforeAuctionSessionTeamId:
                  sessionTeam1Id,
                beforePlayerId:
                  player1Id,
                beforeAmount: 31,
                beforeContractYear: 1,
                afterAuctionSessionTeamId:
                  sessionTeam2Id,
                afterPlayerId:
                  player2Id,
                afterAmount: 29,
                afterContractYear: 2
              }
            )
          );

        db.update(auctionEvents)
          .set({
            createdAt:
              "2026-09-16 20:10:00"
          })
          .where(
            eq(
              auctionEvents.id,
              award.id
            )
          )
          .run();

        db.update(auctionEvents)
          .set({
            createdAt:
              "2026-09-16 20:20:00"
          })
          .where(
            eq(
              auctionEvents.id,
              suspension.id
            )
          )
          .run();

        db.update(auctionEvents)
          .set({
            createdAt:
              "2026-09-16 20:30:00"
          })
          .where(
            eq(
              auctionEvents.id,
              correction.id
            )
          )
          .run();

        const repository =
          new SqliteAdminActivityRepository();

        const items =
          await repository
            .listRecentByAuctionSessionId(
              auctionSessionId
            );

        expect(items).toHaveLength(3);

        expect(
          items.map(
            (item) => item.eventType
          )
        ).toEqual([
          "TECHNICAL_ROSTER_CORRECTION",
          "SESSION_SUSPENDED",
          "AUCTION_AWARD_CONFIRMED"
        ]);

        expect(items[0]).toMatchObject({
          eventId: correction.id,
          eventType:
            "TECHNICAL_ROSTER_CORRECTION",
          actorName: "Gianfranco",
          actorRole: "ADMINISTRATOR",
          comment:
            "Corretto giocatore e costo",
          beforeTeamName:
            "Atletico Milano",
          beforePlayerName:
            "Lautaro Martinez",
          beforeAmount: 31,
          beforeContractYear: 1,
          afterTeamName:
            "Dinamo Porta Romana",
          afterPlayerName:
            "Marcus Thuram",
          afterAmount: 29,
          afterContractYear: 2
        });

        expect(items[1]).toMatchObject({
          eventId: suspension.id,
          eventType:
            "SESSION_SUSPENDED",
          suspensionReason:
            "PIZZA_BREAK",
          playerName: null,
          teamName: null
        });

        expect(items[2]).toMatchObject({
          eventId: award.id,
          eventType:
            "AUCTION_AWARD_CONFIRMED",
          playerName:
            "Lautaro Martinez",
          teamName:
            "Dinamo Porta Romana",
          amount: 47
        });
      }
    );

    it(
      "limits results after applying newest-first ordering",
      async () => {
        const eventRepository =
          new SqliteAuctionEventRepository();

        const suspended =
          db.transaction((tx) =>
            eventRepository.createWithExecutor(
              tx,
              {
                auctionSessionId,
                eventType:
                  "SESSION_SUSPENDED",
                suspensionReason:
                  "TECHNICAL_BREAK"
              }
            )
          );

        const resumed =
          db.transaction((tx) =>
            eventRepository.createWithExecutor(
              tx,
              {
                auctionSessionId,
                eventType:
                  "SESSION_RESUMED"
              }
            )
          );

        const reopened =
          db.transaction((tx) =>
            eventRepository.createWithExecutor(
              tx,
              {
                auctionSessionId,
                eventType:
                  "SESSION_REOPENED"
              }
            )
          );

        const timestamps = [
          [
            suspended.id,
            "2026-09-16 21:00:00"
          ],
          [
            resumed.id,
            "2026-09-16 21:10:00"
          ],
          [
            reopened.id,
            "2026-09-16 21:20:00"
          ]
        ] as const;

        for (
          const [
            eventId,
            createdAt
          ] of timestamps
        ) {
          db.update(auctionEvents)
            .set({
              createdAt
            })
            .where(
              eq(
                auctionEvents.id,
                eventId
              )
            )
            .run();
        }

        const repository =
          new SqliteAdminActivityRepository();

        const items =
          await repository
            .listRecentByAuctionSessionId(
              auctionSessionId,
              2
            );

        expect(
          items.map(
            (item) => item.eventType
          )
        ).toEqual([
          "SESSION_REOPENED",
          "SESSION_RESUMED"
        ]);
      }
    );
  }
);
