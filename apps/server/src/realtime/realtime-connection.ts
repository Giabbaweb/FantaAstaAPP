import type {
  RealtimeRole
} from "@fantaastaapp/contracts";

export type UnregisteredRealtimeConnection = {
  status: "UNREGISTERED";
  socketId: string;
  connectedAt: string;
};

export type RegisteredRealtimeConnection = {
  status: "REGISTERED";
  socketId: string;
  deviceId: string;
  auctionSessionId: string;
  auctionSessionTeamId: string;
  role: RealtimeRole;
  connectedAt: string;
  registeredAt: string;
};

export type RealtimeConnection =
  | UnregisteredRealtimeConnection
  | RegisteredRealtimeConnection;

export function createUnregisteredRealtimeConnection(
  input: {
    socketId: string;
    connectedAt?: string;
  }
): UnregisteredRealtimeConnection {
  return {
    status: "UNREGISTERED",
    socketId: input.socketId,
    connectedAt:
      input.connectedAt ?? new Date().toISOString()
  };
}

export function registerRealtimeConnection(
  connection: UnregisteredRealtimeConnection,
  input: {
    deviceId: string;
    auctionSessionId: string;
    auctionSessionTeamId: string;
    role: RealtimeRole;
    registeredAt?: string;
  }
): RegisteredRealtimeConnection {
  return {
    status: "REGISTERED",
    socketId: connection.socketId,
    deviceId: input.deviceId,
    auctionSessionId: input.auctionSessionId,
    auctionSessionTeamId:
      input.auctionSessionTeamId,
    role: input.role,
    connectedAt: connection.connectedAt,
    registeredAt:
      input.registeredAt ?? new Date().toISOString()
  };
}
