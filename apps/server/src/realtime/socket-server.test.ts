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

import {
  buildApp
} from "../app.js";

describe("Socket.IO server", () => {
  let app: Awaited<
    ReturnType<typeof buildApp>
  >;

  beforeAll(async () => {
    app = await buildApp();

    await app.listen({
      host: "127.0.0.1",
      port: 0
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("accepts a realtime client connection", async () => {
    const address =
      app.server.address() as AddressInfo;

    const client: Socket =
      createSocketClient(
        `http://127.0.0.1:${address.port}`,
        {
          transports: ["websocket"],
          forceNew: true,
          reconnection: false
        }
      );

    try {
      await new Promise<void>((resolve, reject) => {
        client.once("connect", resolve);
        client.once("connect_error", reject);
      });

      expect(client.connected).toBe(true);
      expect(client.id).toEqual(expect.any(String));
    } finally {
      client.disconnect();
    }
  });
});
