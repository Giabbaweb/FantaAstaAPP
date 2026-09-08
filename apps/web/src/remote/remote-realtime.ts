import type {
  Socket
} from "socket.io-client";

import type {
  AuctionCommandAck,
  AuctionCommandRequest,
  RealtimeAuctionSnapshot,
  RealtimeError,
  RealtimeRegisteredPayload
} from "@fantaastaapp/contracts";

import {
  auctionCommandAckSchema
} from "@fantaastaapp/contracts";

import {
  createRealtimeClient
} from "../shared/realtime-client.js";

export type RemoteRealtimeClientOptions = {
  deviceId: string;
  auctionSessionId: string;
  auctionSessionTeamId: string;
  pin: string;

  onRegistered?: (
    payload: RealtimeRegisteredPayload
  ) => void;

  onSnapshot?: (
    snapshot: RealtimeAuctionSnapshot
  ) => void;

  onError?: (
    error: RealtimeError
  ) => void;

  onDisconnected?: () => void;

  onConnectError?: () => void;
};

export type RemoteRealtimeClient = {
  socket: Socket;

  sendCommand: (
    command: AuctionCommandRequest
  ) => Promise<AuctionCommandAck>;

  disconnect: () => void;
};

export function createRemoteRealtimeClient(
  options: RemoteRealtimeClientOptions
): RemoteRealtimeClient {
  const realtimeClient =
    createRealtimeClient({
    onConnected: (
      _payload,
      socket
    ) => {
      socket.emit(
        "realtime:register",
        {
          kind: "TEAM",
          deviceId: options.deviceId,
          auctionSessionId:
            options.auctionSessionId,
          auctionSessionTeamId:
            options.auctionSessionTeamId,
          role: "OPERATOR",
          pin: options.pin
        }
      );
    },

    onRegistered: (payload) => {
      if (
        payload.kind !== "TEAM" ||
        payload.role !== "OPERATOR" ||
        payload.auctionSessionTeamId !==
          options.auctionSessionTeamId
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
      : {}),

    ...(options.onDisconnected
      ? {
          onDisconnected:
            options.onDisconnected
        }
      : {}),

    ...(options.onConnectError
      ? {
          onConnectError:
            options.onConnectError
        }
      : {})
    });

  return {
    ...realtimeClient,

    sendCommand:
      (
        command
      ): Promise<AuctionCommandAck> =>
        new Promise(
          (resolve, reject) => {
            const timeout =
              window.setTimeout(
                () => {
                  reject(
                    new Error(
                      "Timeout durante il comando d'asta."
                    )
                  );
                },
                5000
              );

            realtimeClient.socket.emit(
              "auction:command",
              command,
              (payload: unknown) => {
                window.clearTimeout(
                  timeout
                );

                const parsed =
                  auctionCommandAckSchema
                    .safeParse(payload);

                if (!parsed.success) {
                  reject(
                    new Error(
                      "Acknowledgement realtime non valido."
                    )
                  );

                  return;
                }

                resolve(parsed.data);
              }
            );
          }
        )
  };
}
