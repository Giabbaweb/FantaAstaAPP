import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import {
  buildApp
} from "../app.js";
import {
  createAuctionCallAggregate,
  createAuctionSession,
  createLeague
} from "../test/auction-call-fixtures.js";

describe("auction call read routes", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it(
    "returns an auction call aggregate by id",
    async () => {
      const fixture =
        await createAuctionCallAggregate();

      const response = await app.inject({
        method: "GET",
        url:
          `/api/auction-calls/${fixture.auctionCallId}`
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        data: {
          call: {
            id: string;
            auctionSessionId: string;
            playerId: string;
            callerAuctionSessionTeamId: string;
            status: string;
            openingBid: number | null;
            currentBid: number | null;
            currentLeaderAuctionSessionTeamId:
              | string
              | null;
            currentTurnAuctionSessionTeamId:
              | string
              | null;
            provisionalWinnerAuctionSessionTeamId:
              | string
              | null;
            createdAt: string;
            updatedAt: string;
          };
          teams: Array<{
            auctionCallId: string;
            auctionSessionTeamId: string;
            turnOrder: number;
            status: string;
            maximumBid: number;
            exclusionReason: string | null;
          }>;
        };
        error: null;
      }>();

      expect(body.error).toBeNull();

      expect(body.data.call).toEqual({
        id: fixture.auctionCallId,
        auctionSessionId:
          fixture.auctionSessionId,
        playerId: fixture.playerId,
        callerAuctionSessionTeamId:
          fixture.auctionSessionTeam1Id,
        status: "DRAFT",
        openingBid: null,
        currentBid: null,
        currentLeaderAuctionSessionTeamId: null,
        currentTurnAuctionSessionTeamId: null,
        provisionalWinnerAuctionSessionTeamId: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(body.data.teams).toEqual([
        {
          auctionCallId: fixture.auctionCallId,
          auctionSessionTeamId:
            fixture.auctionSessionTeam1Id,
          turnOrder: 1,
          status: "ACTIVE",
          maximumBid: 307,
          exclusionReason: null
        },
        {
          auctionCallId: fixture.auctionCallId,
          auctionSessionTeamId:
            fixture.auctionSessionTeam2Id,
          turnOrder: 2,
          status: "ACTIVE",
          maximumBid: 307,
          exclusionReason: null
        },
        {
          auctionCallId: fixture.auctionCallId,
          auctionSessionTeamId:
            fixture.auctionSessionTeam3Id,
          turnOrder: 3,
          status: "ACTIVE",
          maximumBid: 307,
          exclusionReason: null
        }
      ]);
    }
  );

  it(
    "returns 404 when the auction call does not exist",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auction-calls/missing-auction-call"
      });

      expect(response.statusCode).toBe(404);

      expect(response.json()).toEqual({
        data: null,
        error: {
          code: "AUCTION_CALL_NOT_FOUND",
          message:
            'Auction call "missing-auction-call" was not found'
        }
      });
    }
  );

  it(
    "returns the operational auction call for a session",
    async () => {
      const fixture =
        await createAuctionCallAggregate();

      const response = await app.inject({
        method: "GET",
        url:
          `/api/auction-sessions/${fixture.auctionSessionId}/auction-call`
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<{
        data: {
          call: {
            id: string;
            status: string;
          };
          teams: unknown[];
        };
        error: null;
      }>();

      expect(body.error).toBeNull();
      expect(body.data.call).toMatchObject({
        id: fixture.auctionCallId,
        status: "DRAFT"
      });
      expect(body.data.teams).toHaveLength(3);
    }
  );

  it(
    "returns null when the session has no operational auction call",
    async () => {
      await createLeague();

      const session =
        await createAuctionSession({
          id: "session-without-auction-call",
          season: "2027/2028",
          editionNumber: 2
        });

      const response = await app.inject({
        method: "GET",
        url:
          `/api/auction-sessions/${session.id}/auction-call`
      });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        data: null,
        error: null
      });
    }
  );
});
