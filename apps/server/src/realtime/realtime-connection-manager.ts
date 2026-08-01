import type {
  RealtimeRole
} from "@fantaastaapp/contracts";

import {
  createUnregisteredRealtimeConnection,
  registerRealtimeConnection,
  type RealtimeConnection,
  type RegisteredRealtimeConnection,
  type UnregisteredRealtimeConnection
} from "./realtime-connection.js";

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
    input: {
      deviceId: string;
      auctionSessionId: string;
      auctionSessionTeamId: string;
      role: RealtimeRole;
      registeredAt?: string;
    }
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
