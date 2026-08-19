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
  type RealtimeConnectedPayload,
  type RealtimeError,
  type RealtimeRegisteredPayload
} from "@fantaastaapp/contracts";

export type RealtimeClientOptions = {
  onConnected?: (
    payload: RealtimeConnectedPayload,
    socket: Socket
  ) => void;

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

export type RealtimeClient = {
  socket: Socket;
  disconnect: () => void;
};

export function createRealtimeClient(
  options: RealtimeClientOptions
): RealtimeClient {
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

      options.onConnected?.(
        parsed.data,
        socket
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

      if (!parsed.success) {
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
