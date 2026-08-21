import {
  describe,
  expect,
  it
} from "vitest";

import {
  NoopRealtimePublisher,
  type RealtimeAuctionEvent,
  type RealtimeAuctionSnapshot,
  type RealtimePublisher
} from "./realtime-publisher.js";

describe("RealtimePublisher", () => {
  it("supports publishing an auction event", async () => {
    const publisher: RealtimePublisher =
      new NoopRealtimePublisher();

    const event: RealtimeAuctionEvent = {
      type: "BID_PLACED",
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      occurredAt:
        "2026-08-02T21:00:00.000Z",
      payload: {
        auctionSessionTeamId:
          "session-team-1",
        bid: 25
      }
    };

    await expect(
      publisher.publishAuctionEvent(event)
    ).resolves.toBeUndefined();
  });

  it("supports publishing an auction snapshot", async () => {
    const publisher: RealtimePublisher =
      new NoopRealtimePublisher();

    const snapshot: RealtimeAuctionSnapshot = {
      stateVersion: 1,
      generatedAt:
        "2026-08-02T21:00:00.000Z",
      session: {
        id: "session-1",
        leagueId: "league-1",
        season: "2026/2027",
        editionNumber: 35,
        status: "RUNNING",
        suspensionReason: null,
        initialCredits: 330,
      maximumInitialRosterEntries: 11,
        createdAt:
          "2026-08-02T20:00:00.000Z",
        updatedAt:
          "2026-08-02T21:00:00.000Z"
      },
    sessionTeams: [],
    operationalAuctionCall: null,
    publicDisplay: {
      league: {
        id: "league-1",
        name: "SFL'92",
        logoPath: null,
      },
      teams: [],
      currentPlayer: null,
      recentAwards: []
    }
    };

    await expect(
      publisher.publishAuctionSnapshot(
        snapshot
      )
    ).resolves.toBeUndefined();
  });

  it("supports every initial auction event type", async () => {
    const publisher =
      new NoopRealtimePublisher();

    const eventTypes = [
      "AUCTION_CALL_OPENED",
      "BID_PLACED",
      "TEAM_PASSED",
      "TEAM_PASS_UNDONE",
      "AUCTION_CALL_CONFIRMED",
      "AUCTION_CALL_CANCELLED"
    ] as const;

    for (const type of eventTypes) {
      await expect(
        publisher.publishAuctionEvent({
          type,
          auctionSessionId: "session-1",
          auctionCallId: "auction-call-1",
          occurredAt:
            "2026-08-02T21:00:00.000Z",
          payload: {}
        })
      ).resolves.toBeUndefined();
    }
  });

  it("does not mutate the published event", async () => {
    const publisher =
      new NoopRealtimePublisher();

    const event: RealtimeAuctionEvent = {
      type: "AUCTION_CALL_OPENED",
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      occurredAt:
        "2026-08-02T21:00:00.000Z",
      payload: {
        openingBid: 1
      }
    };

    const originalEvent =
      structuredClone(event);

    await publisher.publishAuctionEvent(event);

    expect(event).toEqual(originalEvent);
  });
});
