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

export type AdminRealtimeClientOptions = {
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

export type AdminRealtimeClient = {
  socket: Socket;
  disconnect: () => void;
};

export function createAdminRealtimeClient(
  options: AdminRealtimeClientOptions
): AdminRealtimeClient {
  return createRealtimeClient({
    onConnected: (
      _payload,
      socket
    ) => {
      socket.emit(
        "realtime:register",
        {
          kind: "ADMIN",
          deviceId: options.deviceId,
          auctionSessionId:
            options.auctionSessionId
        }
      );
    },

    onRegistered: (payload) => {
      if (payload.kind !== "ADMIN") {
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
