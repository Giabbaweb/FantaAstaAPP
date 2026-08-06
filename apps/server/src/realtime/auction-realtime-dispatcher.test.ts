import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import {
  AuctionRealtimeDispatcher
} from "./auction-realtime-dispatcher.js";

describe("AuctionRealtimeDispatcher", () => {
  const aggregate: AuctionCallAggregate = {
    call: {
      id: "auction-call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      callerAuctionSessionTeamId:
        "auction-session-team-1",
      status: "OPEN",
      openingBid: 1,
      currentBid: 5,
      currentLeaderAuctionSessionTeamId:
        "auction-session-team-2",
      currentTurnAuctionSessionTeamId:
        "auction-session-team-3",
      provisionalWinnerAuctionSessionTeamId:
        null,
      createdAt:
        "2026-08-02T20:00:00.000Z",
      updatedAt:
        "2026-08-02T20:01:00.000Z"
    },
    teams: [
      {
        auctionCallId: "auction-call-1",
        auctionSessionTeamId:
          "auction-session-team-1",
        turnOrder: 1,
        status: "ACTIVE",
        maximumBid: 307,
        exclusionReason: null
      }
    ]
  };

  it("publishes an event from the persisted aggregate", async () => {
    const publishAuctionEvent =
      vi.fn().mockResolvedValue(undefined);

    const publisher = {
      publishAuctionEvent
    };

    const dispatcher =
      new AuctionRealtimeDispatcher(
        publisher,
        () =>
          "2026-08-02T21:30:00.000Z"
      );

    await dispatcher.dispatch({
      type: "AUCTION_CALL_OPENED",
      aggregate,
      payload: {
        openingBid: 1
      }
    });

    expect(
      publishAuctionEvent
    ).toHaveBeenCalledOnce();

    expect(
      publishAuctionEvent
    ).toHaveBeenCalledWith({
      type: "AUCTION_CALL_OPENED",
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      occurredAt:
        "2026-08-02T21:30:00.000Z",
      payload: {
        aggregate,
        openingBid: 1
      }
    });
  });

  it("supports every auction event type", async () => {
    const publishAuctionEvent =
      vi.fn().mockResolvedValue(undefined);

    const dispatcher =
      new AuctionRealtimeDispatcher(
        {
          publishAuctionEvent
        },
        () =>
          "2026-08-02T21:30:00.000Z"
      );

    const eventTypes = [
      "AUCTION_CALL_OPENED",
      "BID_PLACED",
      "TEAM_PASSED",
      "TEAM_PASS_UNDONE",
      "AUCTION_CALL_CONFIRMED",
      "AUCTION_CALL_CANCELLED"
    ] as const;

    for (const type of eventTypes) {
      await dispatcher.dispatch({
        type,
        aggregate
      });
    }

    expect(
      publishAuctionEvent
    ).toHaveBeenCalledTimes(
      eventTypes.length
    );

    expect(
      publishAuctionEvent.mock.calls.map(
        ([event]) => event.type
      )
    ).toEqual(eventTypes);
  });

  it("propagates publisher failures", async () => {
    const dispatcher =
      new AuctionRealtimeDispatcher({
        publishAuctionEvent:
          vi.fn().mockRejectedValue(
            new Error(
              "Realtime publication failed"
            )
          )
      });

    await expect(
      dispatcher.dispatch({
        type: "BID_PLACED",
        aggregate,
        payload: {
          auctionSessionTeamId:
            "auction-session-team-2",
          bid: 5
        }
      })
    ).rejects.toThrow(
      "Realtime publication failed"
    );
  });

  it("does not mutate the aggregate or payload", async () => {
    const dispatcher =
      new AuctionRealtimeDispatcher({
        publishAuctionEvent:
          vi.fn().mockResolvedValue(undefined)
      });

    const payload = {
      auctionSessionTeamId:
        "auction-session-team-2",
      bid: 5
    };

    const originalAggregate =
      structuredClone(aggregate);

    const originalPayload =
      structuredClone(payload);

    await dispatcher.dispatch({
      type: "BID_PLACED",
      aggregate,
      payload
    });

    expect(aggregate).toEqual(
      originalAggregate
    );

    expect(payload).toEqual(
      originalPayload
    );
  });
});
