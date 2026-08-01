import type {
  AddressInfo
} from "node:net";

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from "vitest";
import {
  io as createSocketClient,
  type Socket
} from "socket.io-client";

import type {
  RealtimeConnectedPayload,
  RealtimeError,
  RealtimeRegisteredPayload
} from "@fantaastaapp/contracts";

import {
  buildApp
} from "../app.js";

describe("Socket.IO server", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  let serverUrl: string;

  beforeAll(async () => {
    app = await buildApp();

    await app.listen({
      host: "127.0.0.1",
      port: 0
    });

    const address =
      app.server.address() as AddressInfo;

    serverUrl =
      `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function createClient(): Socket {
    return createSocketClient(serverUrl, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false
    });
  }

  it("accepts a realtime client connection", async () => {
    const client = createClient();

    try {
      const payload =
        await new Promise<RealtimeConnectedPayload>(
          (resolve, reject) => {
            client.once(
              "realtime:connected",
              resolve
            );

            client.once(
              "connect_error",
              reject
            );
          }
        );

      expect(client.connected).toBe(true);
      expect(payload).toEqual({
        socketId: client.id,
        connectedAt: expect.any(String)
      });
    } finally {
      client.disconnect();
    }
  });

  it("registers a realtime client", async () => {
    const client = createClient();

    try {
      await new Promise<void>((resolve, reject) => {
        client.once("connect", resolve);
        client.once("connect_error", reject);
      });

      const registeredPayloadPromise =
        new Promise<RealtimeRegisteredPayload>(
          (resolve) => {
            client.once(
              "realtime:registered",
              resolve
            );
          }
        );

      client.emit("realtime:register", {
        deviceId: "device-1",
        auctionSessionId: "session-1",
        auctionSessionTeamId: "session-team-1",
        role: "OPERATOR"
      });

      const payload =
        await registeredPayloadPromise;

      expect(payload).toEqual({
        socketId: client.id,
        deviceId: "device-1",
        auctionSessionId: "session-1",
        auctionSessionTeamId: "session-team-1",
        role: "OPERATOR",
        connectedAt: expect.any(String),
        registeredAt: expect.any(String)
      });
    } finally {
      client.disconnect();
    }
  });

  it("rejects an invalid registration payload", async () => {
    const client = createClient();

    try {
      await new Promise<void>((resolve, reject) => {
        client.once("connect", resolve);
        client.once("connect_error", reject);
      });

      const errorPayloadPromise =
        new Promise<RealtimeError>(
          (resolve) => {
            client.once(
              "realtime:error",
              resolve
            );
          }
        );

      client.emit("realtime:register", {
        deviceId: "",
        auctionSessionId: "session-1",
        role: "OPERATOR"
      });

      const payload =
        await errorPayloadPromise;

      expect(payload.code).toBe(
        "VALIDATION_ERROR"
      );

      expect(payload.message).toBe(
        "Realtime registration payload is invalid"
      );

      expect(payload.details).toEqual({
        issues: expect.any(Array)
      });
    } finally {
      client.disconnect();
    }
  });
});
