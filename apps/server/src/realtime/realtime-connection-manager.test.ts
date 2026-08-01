import {
  describe,
  expect,
  it
} from "vitest";

import {
  RealtimeConnectionManager
} from "./realtime-connection-manager.js";

describe("RealtimeConnectionManager", () => {
  it("stores a newly connected client", () => {
    const manager =
      new RealtimeConnectionManager();

    const connection = manager.connect({
      socketId: "socket-1",
      connectedAt: "2026-08-01T20:00:00.000Z"
    });

    expect(
      manager.findBySocketId("socket-1")
    ).toEqual(connection);
  });

  it("registers an existing connection", () => {
    const manager =
      new RealtimeConnectionManager();

    manager.connect({
      socketId: "socket-1",
      connectedAt: "2026-08-01T20:00:00.000Z"
    });

    const registeredConnection =
      manager.register("socket-1", {
        deviceId: "device-1",
        auctionSessionId: "session-1",
        auctionSessionTeamId: "session-team-1",
        role: "OPERATOR",
        registeredAt:
          "2026-08-01T20:01:00.000Z"
      });

    expect(registeredConnection).toEqual({
      status: "REGISTERED",
      socketId: "socket-1",
      deviceId: "device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      role: "OPERATOR",
      connectedAt: "2026-08-01T20:00:00.000Z",
      registeredAt: "2026-08-01T20:01:00.000Z"
    });
  });

  it("rejects registration for a missing connection", () => {
    const manager =
      new RealtimeConnectionManager();

    expect(() =>
      manager.register("missing-socket", {
        deviceId: "device-1",
        auctionSessionId: "session-1",
        auctionSessionTeamId: "session-team-1",
        role: "OPERATOR"
      })
    ).toThrow(
      'Realtime connection "missing-socket" was not found'
    );
  });

  it("rejects duplicate registration", () => {
    const manager =
      new RealtimeConnectionManager();

    manager.connect({
      socketId: "socket-1"
    });

    manager.register("socket-1", {
      deviceId: "device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      role: "OPERATOR"
    });

    expect(() =>
      manager.register("socket-1", {
        deviceId: "device-2",
        auctionSessionId: "session-1",
        auctionSessionTeamId: "session-team-1",
        role: "OBSERVER"
      })
    ).toThrow(
      'Realtime connection "socket-1" is already registered'
    );
  });

  it("removes and returns a disconnected client", () => {
    const manager =
      new RealtimeConnectionManager();

    const connection = manager.connect({
      socketId: "socket-1"
    });

    expect(
      manager.disconnect("socket-1")
    ).toEqual(connection);

    expect(
      manager.findBySocketId("socket-1")
    ).toBeNull();
  });

  it("returns null when disconnecting an unknown client", () => {
    const manager =
      new RealtimeConnectionManager();

    expect(
      manager.disconnect("missing-socket")
    ).toBeNull();
  });

  it("lists all connections", () => {
    const manager =
      new RealtimeConnectionManager();

    manager.connect({
      socketId: "socket-1"
    });

    manager.connect({
      socketId: "socket-2"
    });

    expect(
      manager.listConnections()
    ).toHaveLength(2);
  });

  it("lists only registered connections for a session", () => {
    const manager =
      new RealtimeConnectionManager();

    manager.connect({
      socketId: "socket-1"
    });

    manager.register("socket-1", {
      deviceId: "device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      role: "OPERATOR"
    });

    manager.connect({
      socketId: "socket-2"
    });

    manager.register("socket-2", {
      deviceId: "device-2",
      auctionSessionId: "session-2",
      auctionSessionTeamId: "session-team-2",
      role: "OBSERVER"
    });

    manager.connect({
      socketId: "socket-3"
    });

    expect(
      manager.listSessionConnections("session-1")
    ).toEqual([
      expect.objectContaining({
        socketId: "socket-1",
        auctionSessionId: "session-1"
      })
    ]);
  });
});
