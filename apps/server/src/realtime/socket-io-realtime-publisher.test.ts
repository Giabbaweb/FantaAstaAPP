import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import type {
  Server as SocketIOServer
} from "socket.io";

import type {
  RealtimeAuctionEvent,
  RealtimeAuctionSnapshot
} from "@fantaastaapp/contracts";

import {
  SocketIoRealtimePublisher
} from "./socket-io-realtime-publisher.js";

describe("SocketIoRealtimePublisher", () => {
  function createFixture() {
    const emit = vi.fn();

    const to = vi.fn(() => ({
      emit
    }));

    const io = {
      to
    } as unknown as SocketIOServer;

    return {
      emit,
      to,
      publisher:
        new SocketIoRealtimePublisher(io)
    };
  }

  it("publishes an auction event to the session room", async () => {
    const {
      emit,
      to,
      publisher
    } = createFixture();

    const event: RealtimeAuctionEvent = {
      type: "BID_PLACED",
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      occurredAt:
        "2026-08-02T21:15:00.000Z",
      payload: {
        auctionSessionTeamId:
          "session-team-1",
        bid: 25
      }
    };

    await publisher.publishAuctionEvent(event);

    expect(to).toHaveBeenCalledWith(
      "auction-session:session-1"
    );

    expect(emit).toHaveBeenCalledWith(
      "auction:event",
      event
    );
  });

  it("publishes an auction snapshot to the session room", async () => {
    const {
      emit,
      to,
      publisher
    } = createFixture();

    const snapshot: RealtimeAuctionSnapshot = {
      stateVersion: 2,
      generatedAt:
        "2026-08-02T21:15:00.000Z",
      session: {
        id: "session-1",
        leagueId: "league-1",
        season: "2026/2027",
        editionNumber: 35,
        status: "RUNNING",
        initialCredits: 330,
        createdAt:
          "2026-08-02T20:00:00.000Z",
        updatedAt:
          "2026-08-02T21:00:00.000Z"
      },
      sessionTeams: [],
      operationalAuctionCall: null
    };

    await publisher
      .publishAuctionSnapshot(snapshot);

    expect(to).toHaveBeenCalledWith(
      "auction-session:session-1"
    );

    expect(emit).toHaveBeenCalledWith(
      "auction:snapshot",
      snapshot
    );
  });

  it("rejects an empty event session identifier", async () => {
    const {
      publisher
    } = createFixture();

    await expect(
      publisher.publishAuctionEvent({
        type: "AUCTION_CALL_OPENED",
        auctionSessionId: "   ",
        auctionCallId: "auction-call-1",
        occurredAt:
          "2026-08-02T21:15:00.000Z",
        payload: {}
      })
    ).rejects.toThrow(
      "auctionSessionId must not be empty"
    );
  });

  it("rejects an empty snapshot session identifier", async () => {
    const {
      publisher
    } = createFixture();

    await expect(
      publisher.publishAuctionSnapshot({
        stateVersion: 0,
        generatedAt:
          "2026-08-02T21:15:00.000Z",
        session: {
          id: "   ",
          leagueId: "league-1",
          season: "2026/2027",
          editionNumber: 35,
          status: "RUNNING",
          initialCredits: 330,
          createdAt:
            "2026-08-02T20:00:00.000Z",
          updatedAt:
            "2026-08-02T21:00:00.000Z"
        },
        sessionTeams: [],
        operationalAuctionCall: null
      })
    ).rejects.toThrow(
      "auctionSessionId must not be empty"
    );
  });
});
