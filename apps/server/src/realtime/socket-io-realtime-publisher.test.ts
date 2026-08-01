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
  RealtimeAuctionEvent
} from "@fantaastaapp/contracts";

import {
  SocketIoRealtimePublisher
} from "./socket-io-realtime-publisher.js";

describe("SocketIoRealtimePublisher", () => {
  it("publishes an auction event to the session room", async () => {
    const emit = vi.fn();

    const to = vi.fn(() => ({
      emit
    }));

    const io = {
      to
    } as unknown as SocketIOServer;

    const publisher =
      new SocketIoRealtimePublisher(io);

    const event: RealtimeAuctionEvent = {
      type: "BID_PLACED",
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      occurredAt: "2026-08-01T21:15:00.000Z",
      payload: {
        auctionSessionTeamId: "session-team-1",
        amount: 25
      }
    };

    await publisher.publishAuctionEvent(event);

    expect(to).toHaveBeenCalledOnce();
    expect(to).toHaveBeenCalledWith(
      "auction-session:session-1"
    );

    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(
      "auction:event",
      event
    );
  });

  it("rejects an empty session identifier", async () => {
    const io = {
      to: vi.fn()
    } as unknown as SocketIOServer;

    const publisher =
      new SocketIoRealtimePublisher(io);

    await expect(
      publisher.publishAuctionEvent({
        type: "AUCTION_CALL_OPENED",
        auctionSessionId: "   ",
        auctionCallId: "auction-call-1",
        occurredAt: "2026-08-01T21:15:00.000Z",
        payload: {}
      })
    ).rejects.toThrow(
      "auctionSessionId must not be empty"
    );
  });
});
