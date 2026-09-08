import type {
  RealtimeRole
} from "@fantaastaapp/contracts";

import {
  createUnregisteredRealtimeConnection,
  registerRealtimeConnection,
  type RealtimeConnection,
  type RegisteredRealtimeConnection,
  type RegisteredTeamRealtimeConnection,
  type UnregisteredRealtimeConnection
} from "./realtime-connection.js";

type RegisterRealtimeConnectionInput =
  | {
      kind: "TEAM";
      deviceId: string;
      auctionSessionId: string;
      auctionSessionTeamId: string;
      role: RealtimeRole;
      registeredAt?: string;
    }
  | {
      kind: "PUBLIC_DISPLAY";
      deviceId: string;
      auctionSessionId: string;
      registeredAt?: string;
    }
  | {
      kind: "ADMIN";
      deviceId: string;
      auctionSessionId: string;
      registeredAt?: string;
    };

export class RealtimeConnectionManager {
  private readonly connections =
    new Map<string, RealtimeConnection>();

  connect(input: {
    socketId: string;
    connectedAt?: string;
  }): UnregisteredRealtimeConnection {
    const connection =
      createUnregisteredRealtimeConnection(input);

    this.connections.set(
      connection.socketId,
      connection
    );

    return connection;
  }

  register(
    socketId: string,
    input: RegisterRealtimeConnectionInput
  ): RegisteredRealtimeConnection {
    const connection =
      this.connections.get(socketId);

    if (!connection) {
      throw new Error(
        `Realtime connection "${socketId}" was not found`
      );
    }

    if (connection.status === "REGISTERED") {
      throw new Error(
        `Realtime connection "${socketId}" is already registered`
      );
    }

    const registeredConnection =
      registerRealtimeConnection(
        connection,
        input
      );

    this.connections.set(
      socketId,
      registeredConnection
    );

    return registeredConnection;
  }

  disconnect(
    socketId: string
  ): RealtimeConnection | null {
    const connection =
      this.connections.get(socketId) ?? null;

    this.connections.delete(socketId);

    return connection;
  }

  findBySocketId(
    socketId: string
  ): RealtimeConnection | null {
    return this.connections.get(socketId) ?? null;
  }

  listConnections(): RealtimeConnection[] {
    return Array.from(
      this.connections.values()
    );
  }

  findOperatorByAuctionSessionTeamId(
    auctionSessionTeamId: string
  ): RegisteredTeamRealtimeConnection | null {
    return (
      this.listConnections().find(
        (
          connection
        ): connection is RegisteredTeamRealtimeConnection =>
          connection.status === "REGISTERED" &&
          connection.kind === "TEAM" &&
          connection.role === "OPERATOR" &&
          connection.auctionSessionTeamId ===
            auctionSessionTeamId
      ) ?? null
    );
  }

  listSessionConnections(
    auctionSessionId: string
  ): RegisteredRealtimeConnection[] {
    return this.listConnections().filter(
      (
        connection
      ): connection is RegisteredRealtimeConnection =>
        connection.status === "REGISTERED" &&
        connection.auctionSessionId === auctionSessionId
    );
  }
}
