import {
  io,
  type Socket
} from "socket.io-client";

import {
  realtimeAuctionSnapshotSchema,
  realtimeConnectedPayloadSchema,
  realtimeErrorSchema,
  realtimeRegisteredPayloadSchema,
  type RealtimeAuctionSnapshot,
  type RealtimeError,
  type RealtimeRegisteredPayload
} from "@fantaastaapp/contracts";

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
  const socket = io({
    autoConnect: false
  });

  socket.on(
    "realtime:connected",
    (payload: unknown) => {
      const parsed =
        realtimeConnectedPayloadSchema.safeParse(
          payload
        );

      if (!parsed.success) {
        return;
      }

      socket.emit(
        "realtime:register",
        {
          kind: "PUBLIC_DISPLAY",
          deviceId: options.deviceId,
          auctionSessionId:
            options.auctionSessionId
        }
      );
    }
  );

  socket.on(
    "realtime:registered",
    (payload: unknown) => {
      const parsed =
        realtimeRegisteredPayloadSchema.safeParse(
          payload
        );

      if (
        !parsed.success ||
        parsed.data.kind !== "PUBLIC_DISPLAY"
      ) {
        return;
      }

      options.onRegistered?.(
        parsed.data
      );
    }
  );

  socket.on(
    "auction:snapshot",
    (payload: unknown) => {
      const parsed =
        realtimeAuctionSnapshotSchema.safeParse(
          payload
        );

      if (!parsed.success) {
        return;
      }

      options.onSnapshot?.(
        parsed.data
      );
    }
  );

  socket.on(
    "realtime:error",
    (payload: unknown) => {
      const parsed =
        realtimeErrorSchema.safeParse(
          payload
        );

      if (!parsed.success) {
        return;
      }

      options.onError?.(
        parsed.data
      );
    }
  );

  socket.connect();

  return {
    socket,
    disconnect: () => {
      socket.disconnect();
    }
  };
}
