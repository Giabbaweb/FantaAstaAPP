import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
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
  buildApp
} from "../app.js";

const leagueId =
  "league-admin-activity-route";

const sessionId =
  "session-admin-activity-route";

const teamId =
  "team-admin-activity-route";

const sessionTeamId =
  "session-team-admin-activity-route";

const playerId =
  "player-admin-activity-route";

function createFixture(): void {
  db.insert(leagues)
    .values({
      id: leagueId,
      name: "Admin Activity Route League",
      normalizedName:
        "admin activity route league"
    })
    .run();

  db.insert(auctionSessions)
    .values({
      id: sessionId,
      leagueId,
      season: "2026/2027",
      editionNumber: 35,
      initialCredits: 300
    })
    .run();

  db.insert(teams)
    .values({
      id: teamId,
      leagueId,
      name: "Atletico Milano"
    })
    .run();

  db.insert(auctionSessionTeams)
    .values({
      id: sessionTeamId,
      auctionSessionId:
        sessionId,
      teamId,
      tableOrder: 1,
      renewalCredits: 0,
      remainingCredits: 250
    })
    .run();

  db.insert(players)
    .values({
      id: playerId,
      auctionSessionId:
        sessionId,
      fmsCode:
        "ADMIN-ACTIVITY-ROUTE-001",
      name: "Test Player",
      normalizedName:
        "test player",
      role: "A",
      availabilityStatus:
        "ROSTERED"
    })
    .run();

  db.insert(auctionEvents)
    .values([
      {
        id: "activity-route-event-1",
        auctionSessionId:
          sessionId,
        eventType:
          "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY",
        auctionSessionTeamId:
          sessionTeamId,
        playerId,
        amount: 10,
        creditsBefore: 260,
        creditsAfter: 250,
        contractYear: 1,
        actorName: "Gianfranco",
        actorRole:
          "ADMINISTRATOR",
        createdAt:
          "2026-09-16 20:00:00"
      },
      {
        id: "activity-route-event-2",
        auctionSessionId:
          sessionId,
        eventType:
          "SESSION_SUSPENDED",
        suspensionReason:
          "PIZZA_BREAK",
        createdAt:
          "2026-09-16 21:00:00"
      },
      {
        id: "activity-route-event-3",
        auctionSessionId:
          sessionId,
        eventType:
          "ROSTER_ASSIGNMENT_REMOVED",
        actorName:
          "Gianfranco",
        actorRole:
          "ADMINISTRATOR",
        comment:
          "Rimozione di test",
        beforeAuctionSessionTeamId:
          sessionTeamId,
        beforePlayerId:
          playerId,
        beforeAmount: 10,
        beforeContractYear: 1,
        createdAt:
          "2026-09-16 22:00:00"
      }
    ])
    .run();
}

describe(
  "GET /api/auction-sessions/:auctionSessionId/activity",
  () => {
    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp();
    });

    beforeEach(() => {
      resetTestDatabase();
      createFixture();
    });

    afterEach(() => {
      resetTestDatabase();
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "returns recent admin activity newest first",
      async () => {
        {
          const response =
            await app.inject({
              method: "GET",
              url:
                `/api/auction-sessions/${sessionId}/activity`
            });

          expect(
            response.statusCode
          ).toBe(200);

          const body =
            response.json<{
              data: Array<{
                eventId: string;
                eventType: string;
                playerName:
                  string | null;
                teamName:
                  string | null;
                suspensionReason:
                  string | null;
                actorName:
                  string | null;
                comment:
                  string | null;
                beforePlayerName:
                  string | null;
                beforeTeamName:
                  string | null;
                beforeAmount:
                  number | null;
                beforeContractYear:
                  number | null;
              }>;
              error: null;
            }>();

          expect(
            body.error
          ).toBeNull();

          expect(
            body.data
          ).toHaveLength(3);

          expect(
            body.data[0]
          ).toMatchObject({
            eventId:
              "activity-route-event-3",
            eventType:
              "ROSTER_ASSIGNMENT_REMOVED",
            actorName:
              "Gianfranco",
            comment:
              "Rimozione di test",
            beforePlayerName:
              "Test Player",
            beforeTeamName:
              "Atletico Milano",
            beforeAmount: 10,
            beforeContractYear: 1
          });

          expect(
            body.data[1]
          ).toMatchObject({
            eventId:
              "activity-route-event-2",
            eventType:
              "SESSION_SUSPENDED",
            suspensionReason:
              "PIZZA_BREAK"
          });

          expect(
            body.data[2]
          ).toMatchObject({
            eventId:
              "activity-route-event-1",
            eventType:
              "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY",
            playerName:
              "Test Player",
            teamName:
              "Atletico Milano"
          });
        }
      }
    );

    it(
      "respects the limit query parameter",
      async () => {
        {
          const response =
            await app.inject({
              method: "GET",
              url:
                `/api/auction-sessions/${sessionId}/activity?limit=1`
            });

          expect(
            response.statusCode
          ).toBe(200);

          const body =
            response.json<{
              data: unknown[];
              error: null;
            }>();

          expect(
            body.data
          ).toHaveLength(1);
        }
      }
    );

    it(
      "rejects an invalid limit",
      async () => {
        {
          const response =
            await app.inject({
              method: "GET",
              url:
                `/api/auction-sessions/${sessionId}/activity?limit=0`
            });

          expect(
            response.statusCode
          ).toBe(400);

          expect(
            response.json()
          ).toMatchObject({
            data: null,
            error: {
              code:
                "INVALID_REQUEST"
            }
          });
        }
      }
    );
  }
);
