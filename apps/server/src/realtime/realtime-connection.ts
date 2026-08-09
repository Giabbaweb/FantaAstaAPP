import type {
  RealtimeRole
} from "@fantaastaapp/contracts";

export type UnregisteredRealtimeConnection = {
  status: "UNREGISTERED";
  socketId: string;
  connectedAt: string;
};

export type RegisteredTeamRealtimeConnection = {
  status: "REGISTERED";
  kind: "TEAM";
  socketId: string;
  deviceId: string;
  auctionSessionId: string;
  auctionSessionTeamId: string;
  role: RealtimeRole;
  connectedAt: string;
  registeredAt: string;
};

export type RegisteredPublicDisplayRealtimeConnection = {
  status: "REGISTERED";
  kind: "PUBLIC_DISPLAY";
  socketId: string;
  deviceId: string;
  auctionSessionId: string;
  connectedAt: string;
  registeredAt: string;
};

export type RegisteredRealtimeConnection =
  | RegisteredTeamRealtimeConnection
  | RegisteredPublicDisplayRealtimeConnection;

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
  input:
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
): RegisteredRealtimeConnection {
  const baseConnection = {
    status: "REGISTERED" as const,
    kind: input.kind,
    socketId: connection.socketId,
    deviceId: input.deviceId,
    auctionSessionId: input.auctionSessionId,
    connectedAt: connection.connectedAt,
    registeredAt:
      input.registeredAt ?? new Date().toISOString()
  };

  if (input.kind === "TEAM") {
    return {
      ...baseConnection,
      kind: "TEAM",
      auctionSessionTeamId:
        input.auctionSessionTeamId,
      role: input.role
    };
  }

  return {
    ...baseConnection,
    kind: "PUBLIC_DISPLAY"
  };
}
