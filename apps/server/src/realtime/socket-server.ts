import type {
  FastifyInstance
} from "fastify";
import {
  Server as SocketIOServer
} from "socket.io";

import {
  realtimeRegistrationRequestSchema,
  type AuctionCommandAck,
  type RealtimeConnectedPayload,
  type RealtimeError,
  type RealtimeRegisteredPayload
} from "@fantaastaapp/contracts";

import type {
  AuctionCommandSocketHandler
} from "./auction-command-socket.handler.js";
import {
  RealtimeConnectionManager
} from "./realtime-connection-manager.js";
import type {
  RealtimeSnapshotService
} from "./realtime-snapshot.service.js";
import {
  SqliteTeamAccessRepository
} from "./team-access.repository.js";
import {
  TeamAccessService,
  TeamAccessServiceError
} from "./team-access.service.js";
import {
  auctionSessionObserversRoom,
  auctionSessionOperatorsRoom,
  auctionSessionRoom,
  auctionSessionTeamRoom
} from "./room-name.js";

export type SocketServerContext = {
  io: SocketIOServer;
  connectionManager:
    RealtimeConnectionManager;
};

export function createSocketServer(
  app: FastifyInstance,
  realtimeSnapshotService:
    RealtimeSnapshotService
): SocketServerContext {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: true
    }
  });

  const connectionManager =
    new RealtimeConnectionManager();

  const teamAccessService =
    new TeamAccessService(
      new SqliteTeamAccessRepository()
    );

  io.on("connection", (socket) => {
    const connection =
      connectionManager.connect({
        socketId: socket.id
      });

    const connectedPayload: RealtimeConnectedPayload = {
      socketId: connection.socketId,
      connectedAt: connection.connectedAt
    };

    socket.emit(
      "realtime:connected",
      connectedPayload
    );

    app.log.info(
      {
        module: "realtime",
        socketId: socket.id
      },
      "Realtime client connected"
    );

    socket.on(
      "realtime:register",
      async (payload: unknown) => {
        const parsedPayload =
          realtimeRegistrationRequestSchema.safeParse(
            payload
          );

        if (!parsedPayload.success) {
          const errorPayload: RealtimeError = {
            code: "VALIDATION_ERROR",
            message:
              "Realtime registration payload is invalid",
            details: {
              issues: parsedPayload.error.issues
            }
          };

          socket.emit(
            "realtime:error",
            errorPayload
          );

          return;
        }

        try {
          const {
            pin,
            ...registration
          } = parsedPayload.data;

          await teamAccessService
            .authorizeRegistration(
              registration.auctionSessionTeamId,
              registration.auctionSessionId,
              pin
            );

          if (
            registration.role === "OPERATOR" &&
            connectionManager
              .findOperatorByAuctionSessionTeamId(
                registration.auctionSessionTeamId
              )
          ) {
            const errorPayload: RealtimeError = {
              code:
                "OPERATOR_ALREADY_CONNECTED",
              message:
                "An operator is already connected for this auction session team"
            };

            socket.emit(
              "realtime:error",
              errorPayload
            );

            return;
          }

          const registeredConnection =
            connectionManager.register(
              socket.id,
              registration
            );

          await socket.join(
            auctionSessionRoom(
              registeredConnection.auctionSessionId
            )
          );

          await socket.join(
            auctionSessionTeamRoom(
              registeredConnection.auctionSessionTeamId
            )
          );

          await socket.join(
            registeredConnection.role === "OPERATOR"
              ? auctionSessionOperatorsRoom(
                  registeredConnection.auctionSessionId
                )
              : auctionSessionObserversRoom(
                  registeredConnection.auctionSessionId
                )
          );

          const registeredPayload:
            RealtimeRegisteredPayload = {
              socketId: registeredConnection.socketId,
              deviceId: registeredConnection.deviceId,
              auctionSessionId:
                registeredConnection.auctionSessionId,
              auctionSessionTeamId:
                registeredConnection.auctionSessionTeamId,
              role: registeredConnection.role,
              connectedAt:
                registeredConnection.connectedAt,
              registeredAt:
                registeredConnection.registeredAt
            };

          socket.emit(
            "realtime:registered",
            registeredPayload
          );

          const snapshot =
            await realtimeSnapshotService
              .buildSnapshot(
                registeredConnection.auctionSessionId
              );

          socket.emit(
            "auction:snapshot",
            snapshot
          );

          app.log.info(
            {
              module: "realtime",
              socketId: socket.id,
              deviceId:
                registeredConnection.deviceId,
              auctionSessionId:
                registeredConnection.auctionSessionId,
              auctionSessionTeamId:
                registeredConnection.auctionSessionTeamId,
              role: registeredConnection.role
            },
            "Realtime client registered"
          );
        } catch (error) {
          const errorPayload: RealtimeError =
            error instanceof TeamAccessServiceError
              ? {
                  code: "UNAUTHORIZED",
                  message:
                    "Realtime registration is not authorized"
                }
              : {
                  code: "INTERNAL_ERROR",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Realtime registration failed"
                };

          socket.emit(
            "realtime:error",
            errorPayload
          );
        }
      }
    );

    socket.on("disconnect", (reason) => {
      connectionManager.disconnect(socket.id);

      app.log.info(
        {
          module: "realtime",
          socketId: socket.id,
          reason
        },
        "Realtime client disconnected"
      );
    });
  });

  app.addHook("onClose", async () => {
    await io.close();
  });

  return {
    io,
    connectionManager
  };
}

export function registerAuctionCommandSocketHandler(
  io: SocketIOServer,
  handler: AuctionCommandSocketHandler
): void {
  io.on("connection", (socket) => {
    socket.on(
      "auction:command",
      async (
        payload: unknown,
        acknowledge?: (
          response: AuctionCommandAck
        ) => void
      ) => {
        const response =
          await handler.handle(
            socket.id,
            payload
          );

        if (
          typeof acknowledge === "function"
        ) {
          acknowledge(response);
        }
      }
    );
  });
}
