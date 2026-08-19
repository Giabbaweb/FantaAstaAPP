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
        kind: "TEAM",
        deviceId: "device-1",
        auctionSessionId: "session-1",
        auctionSessionTeamId: "session-team-1",
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
        kind: "TEAM",
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
      kind: "TEAM",
      deviceId: "device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      role: "OPERATOR"
    });

    expect(() =>
      manager.register("socket-1", {
        kind: "TEAM",
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
      kind: "TEAM",
      deviceId: "device-1",
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      role: "OPERATOR"
    });

    manager.connect({
      socketId: "socket-2"
    });

    manager.register("socket-2", {
      kind: "TEAM",
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

  it("finds the active operator for an auction session team", () => {
    const manager =
      new RealtimeConnectionManager();

    manager.connect({
      socketId: "operator-socket"
    });

    manager.register("operator-socket", {
      kind: "TEAM",
      deviceId: "operator-device",
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      role: "OPERATOR"
    });

    manager.connect({
      socketId: "observer-socket"
    });

    manager.register("observer-socket", {
      kind: "TEAM",
      deviceId: "observer-device",
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      role: "OBSERVER"
    });

    expect(
      manager.findOperatorByAuctionSessionTeamId(
        "session-team-1"
      )
    ).toEqual(
      expect.objectContaining({
        socketId: "operator-socket",
        role: "OPERATOR"
      })
    );
  });

  it("returns null when a team has no active operator", () => {
    const manager =
      new RealtimeConnectionManager();

    expect(
      manager.findOperatorByAuctionSessionTeamId(
        "session-team-1"
      )
    ).toBeNull();
  });
  it("registers a public display for a session", () => {
    const manager =
      new RealtimeConnectionManager();

    manager.connect({
      socketId: "public-display-socket"
    });

    const registeredConnection =
      manager.register(
        "public-display-socket",
        {
          kind: "PUBLIC_DISPLAY",
          deviceId: "public-display-1",
          auctionSessionId: "session-1"
        }
      );

    expect(registeredConnection).toEqual(
      expect.objectContaining({
        status: "REGISTERED",
        kind: "PUBLIC_DISPLAY",
        socketId: "public-display-socket",
        deviceId: "public-display-1",
        auctionSessionId: "session-1"
      })
    );

    expect(
      manager.listSessionConnections(
        "session-1"
      )
    ).toContainEqual(
      expect.objectContaining({
        kind: "PUBLIC_DISPLAY",
        socketId: "public-display-socket"
      })
    );

  });

  it("registers an admin for a session", () => {
    const manager =
      new RealtimeConnectionManager();

    manager.connect({
      socketId: "admin-socket"
    });

    const registeredConnection =
      manager.register(
        "admin-socket",
        {
          kind: "ADMIN",
          deviceId: "admin-device-1",
          auctionSessionId: "session-1"
        }
      );

    expect(registeredConnection).toEqual(
      expect.objectContaining({
        status: "REGISTERED",
        kind: "ADMIN",
        socketId: "admin-socket",
        deviceId: "admin-device-1",
        auctionSessionId: "session-1"
      })
    );

    expect(
      manager.listSessionConnections(
        "session-1"
      )
    ).toContainEqual(
      expect.objectContaining({
        kind: "ADMIN",
        socketId: "admin-socket"
      })
    );

  });
});
