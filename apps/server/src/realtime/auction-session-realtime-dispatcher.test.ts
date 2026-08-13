import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  RealtimeAuctionEvent
} from "@fantaastaapp/contracts";

import {
  AuctionSessionRealtimeDispatcher
} from "./auction-session-realtime-dispatcher.js";

describe(
  "AuctionSessionRealtimeDispatcher",
  () => {
    it(
      "publishes a suspended session event",
      async () => {
        const publishAuctionEvent =
          vi.fn<
            (
              event: RealtimeAuctionEvent
            ) => Promise<void>
          >()
            .mockResolvedValue(undefined);

        const dispatcher =
          new AuctionSessionRealtimeDispatcher(
            {
              publishAuctionEvent
            },
            () =>
              "2026-08-13T18:55:00.000Z"
          );

        await dispatcher.dispatch({
          type: "SESSION_SUSPENDED",
          auctionSessionId:
            "session-1",
          payload: {
            suspensionReason:
              "PIZZA_BREAK"
          }
        });

        expect(
          publishAuctionEvent
        ).toHaveBeenCalledTimes(1);

        expect(
          publishAuctionEvent
        ).toHaveBeenCalledWith({
          type:
            "SESSION_SUSPENDED",
          auctionSessionId:
            "session-1",
          auctionCallId: null,
          occurredAt:
            "2026-08-13T18:55:00.000Z",
          payload: {
            suspensionReason:
              "PIZZA_BREAK"
          }
        });
      }
    );

    it(
      "publishes a resumed session event",
      async () => {
        const publishAuctionEvent =
          vi.fn<
            (
              event: RealtimeAuctionEvent
            ) => Promise<void>
          >()
            .mockResolvedValue(undefined);

        const dispatcher =
          new AuctionSessionRealtimeDispatcher(
            {
              publishAuctionEvent
            },
            () =>
              "2026-08-13T18:56:00.000Z"
          );

        await dispatcher.dispatch({
          type: "SESSION_RESUMED",
          auctionSessionId:
            "session-1"
        });

        expect(
          publishAuctionEvent
        ).toHaveBeenCalledWith({
          type:
            "SESSION_RESUMED",
          auctionSessionId:
            "session-1",
          auctionCallId: null,
          occurredAt:
            "2026-08-13T18:56:00.000Z",
          payload: {}
        });
      }
    );
  }
);
