import {
  describe,
  expect,
  it
} from "vitest";

import {
  createUnregisteredRealtimeConnection,
  registerRealtimeConnection
} from "./realtime-connection.js";

describe("realtime connection identity", () => {
  it("creates an unregistered connection", () => {
    const connection =
      createUnregisteredRealtimeConnection({
        socketId: "socket-1",
        connectedAt:
          "2026-08-01T20:00:00.000Z"
      });

    expect(connection).toEqual({
      status: "UNREGISTERED",
      socketId: "socket-1",
      connectedAt:
        "2026-08-01T20:00:00.000Z"
    });
  });

  it("registers a TEAM connection without changing its socket identity", () => {
    const connection =
      createUnregisteredRealtimeConnection({
        socketId: "socket-1",
        connectedAt:
          "2026-08-01T20:00:00.000Z"
      });

    const registeredConnection =
      registerRealtimeConnection(connection, {
        kind: "TEAM",
        deviceId: "device-1",
        auctionSessionId: "session-1",
        auctionSessionTeamId:
          "session-team-1",
        role: "OPERATOR",
        registeredAt:
          "2026-08-01T20:01:00.000Z"
      });

    expect(registeredConnection).toEqual({
      status: "REGISTERED",
      kind: "TEAM",
      socketId: "socket-1",
      deviceId: "device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId:
        "session-team-1",
      role: "OPERATOR",
      connectedAt:
        "2026-08-01T20:00:00.000Z",
      registeredAt:
        "2026-08-01T20:01:00.000Z"
    });
  });

  it("supports TEAM observer connections", () => {
    const connection =
      createUnregisteredRealtimeConnection({
        socketId: "socket-observer"
      });

    const registeredConnection =
      registerRealtimeConnection(connection, {
        kind: "TEAM",
        deviceId: "observer-device",
        auctionSessionId: "session-1",
        auctionSessionTeamId:
          "session-team-1",
        role: "OBSERVER"
      });

    expect(registeredConnection.kind).toBe(
      "TEAM"
    );

    if (registeredConnection.kind !== "TEAM") {
      throw new Error(
        "Expected a TEAM realtime connection"
      );
    }

    expect(registeredConnection.role).toBe(
      "OBSERVER"
    );

    expect(registeredConnection.status).toBe(
      "REGISTERED"
    );
  });

  it("registers a PUBLIC_DISPLAY connection", () => {
    const connection =
      createUnregisteredRealtimeConnection({
        socketId: "public-display-socket",
        connectedAt:
          "2026-08-01T20:00:00.000Z"
      });

    const registeredConnection =
      registerRealtimeConnection(connection, {
        kind: "PUBLIC_DISPLAY",
        deviceId: "public-display-1",
        auctionSessionId: "session-1",
        registeredAt:
          "2026-08-01T20:01:00.000Z"
      });

    expect(registeredConnection).toEqual({
      status: "REGISTERED",
      kind: "PUBLIC_DISPLAY",
      socketId: "public-display-socket",
      deviceId: "public-display-1",
      auctionSessionId: "session-1",
      connectedAt:
        "2026-08-01T20:00:00.000Z",
      registeredAt:
        "2026-08-01T20:01:00.000Z"
    });
  });
});
