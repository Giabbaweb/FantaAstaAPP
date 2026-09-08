import type {
  Socket
} from "socket.io-client";

import type {
  RealtimeAuctionSnapshot,
  RealtimeError,
  RealtimeRegisteredPayload
} from "@fantaastaapp/contracts";

import {
  createRealtimeClient
} from "../shared/realtime-client.js";

export type PublicDisplayRealtimeClientOptions = {
  deviceId: string;
  auctionSessionId: string;

  onRegistered?: (
    payload: RealtimeRegisteredPayload
  ) => void;

  onSnapshot?: (
    snapshot: RealtimeAuctionSnapshot
  ) => void;

  onError?: (
    error: RealtimeError
  ) => void;
};

export type PublicDisplayRealtimeClient = {
  socket: Socket;
  disconnect: () => void;
};

export function createPublicDisplayRealtimeClient(
  options: PublicDisplayRealtimeClientOptions
): PublicDisplayRealtimeClient {
  return createRealtimeClient({
    onConnected: (
      _payload,
      socket
    ) => {
      socket.emit(
        "realtime:register",
        {
          kind: "PUBLIC_DISPLAY",
          deviceId: options.deviceId,
          auctionSessionId:
            options.auctionSessionId
        }
      );
    },

    onRegistered: (payload) => {
      if (
        payload.kind !== "PUBLIC_DISPLAY"
      ) {
        return;
      }

      options.onRegistered?.(
        payload
      );
    },

    ...(options.onSnapshot
      ? {
          onSnapshot:
            options.onSnapshot
        }
      : {}),

    ...(options.onError
      ? {
          onError:
            options.onError
        }
      : {})
  });
}
