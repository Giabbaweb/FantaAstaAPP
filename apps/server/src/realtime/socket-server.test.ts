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
  RealtimeAuctionSnapshot,
  RealtimeConnectedPayload,
  RealtimeError,
  RealtimeRegisteredPayload,
  RealtimeRole
} from "@fantaastaapp/contracts";

import {
  buildApp
} from "../app.js";
import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  auctionSessionTeams,
  leagues,
  teams
} from "../db/schema/index.js";
import {
  hashTeamAccessPin
} from "./team-access-pin.js";

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

  async function waitForConnection(
    client: Socket
  ): Promise<void> {
    if (client.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve);
      client.once("connect_error", reject);
    });
  }

  async function seedTeamAccess(
    input: {
      auctionSessionTeamId?: string;
      auctionSessionId?: string;
      teamId?: string;
      pin?: string;
      tableOrder?: number;
      stateVersion?: number;
    } = {}
  ): Promise<{
    auctionSessionTeamId: string;
    auctionSessionId: string;
  }> {
    const auctionSessionTeamId =
      input.auctionSessionTeamId ??
      "auction-session-team-1";

    const auctionSessionId =
      input.auctionSessionId ??
      "session-1";

    const teamId =
      input.teamId ??
      "team-1";

    const pin =
      input.pin ??
      "1234";

    await db.insert(leagues).values({
      id: "league-1",
      name: "League 1",
      normalizedName: "league 1"
    });

    await db.insert(auctionSessions).values({
      id: auctionSessionId,
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 1,
      initialCredits: 330,
      stateVersion: input.stateVersion ?? 0
    });

    await db.insert(teams).values({
      id: teamId,
      leagueId: "league-1",
      name: "Team 1"
    });

    await db.insert(auctionSessionTeams).values({
      id: auctionSessionTeamId,
      auctionSessionId,
      teamId,
      tableOrder: input.tableOrder ?? 1,
      renewalCredits: 0,
      remainingCredits: 330,
      accessPinHash:
        await hashTeamAccessPin(pin)
    });

    return {
      auctionSessionTeamId,
      auctionSessionId
    };
  }

  function registerClient(
    client: Socket,
    input: {
      deviceId: string;
      auctionSessionId: string;
      auctionSessionTeamId: string;
      role: RealtimeRole;
      pin: string;
    }
  ): Promise<RealtimeRegisteredPayload> {
    const registeredPayloadPromise =
      new Promise<RealtimeRegisteredPayload>(
        (resolve) => {
          client.once(
            "realtime:registered",
            resolve
          );
        }
      );

    client.emit(
      "realtime:register",
      input
    );

    return registeredPayloadPromise;
  }

  function waitForRealtimeError(
    client: Socket
  ): Promise<RealtimeError> {
    return new Promise<RealtimeError>(
      (resolve) => {
        client.once(
          "realtime:error",
          resolve
        );
      }
    );
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

  it("registers a client with the correct PIN", async () => {
    const {
      auctionSessionId,
      auctionSessionTeamId
    } = await seedTeamAccess();

    const client = createClient();

    try {
      await waitForConnection(client);

      const payload =
        await registerClient(client, {
          deviceId: "operator-device",
          auctionSessionId,
          auctionSessionTeamId,
          role: "OPERATOR",
          pin: "1234"
        });

      expect(payload).toEqual({
        socketId: client.id,
        deviceId: "operator-device",
        auctionSessionId,
        auctionSessionTeamId,
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
      await waitForConnection(client);

      const errorPayloadPromise =
        waitForRealtimeError(client);

      client.emit("realtime:register", {
        deviceId: "",
        auctionSessionId: "session-1",
        role: "OPERATOR",
        pin: "1234"
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

  it("rejects registration with an incorrect PIN", async () => {
    const {
      auctionSessionId,
      auctionSessionTeamId
    } = await seedTeamAccess();

    const client = createClient();

    try {
      await waitForConnection(client);

      const errorPayloadPromise =
        waitForRealtimeError(client);

      client.emit("realtime:register", {
        deviceId: "operator-device",
        auctionSessionId,
        auctionSessionTeamId,
        role: "OPERATOR",
        pin: "9999"
      });

      await expect(
        errorPayloadPromise
      ).resolves.toEqual({
        code: "UNAUTHORIZED",
        message:
          "Realtime registration is not authorized"
      });
    } finally {
      client.disconnect();
    }
  });

  it("rejects registration for a different session", async () => {
    const {
      auctionSessionTeamId
    } = await seedTeamAccess();

    const client = createClient();

    try {
      await waitForConnection(client);

      const errorPayloadPromise =
        waitForRealtimeError(client);

      client.emit("realtime:register", {
        deviceId: "operator-device",
        auctionSessionId: "different-session",
        auctionSessionTeamId,
        role: "OPERATOR",
        pin: "1234"
      });

      await expect(
        errorPayloadPromise
      ).resolves.toEqual({
        code: "UNAUTHORIZED",
        message:
          "Realtime registration is not authorized"
      });
    } finally {
      client.disconnect();
    }
  });

  it("rejects a second operator for the same team", async () => {
    const {
      auctionSessionId,
      auctionSessionTeamId
    } = await seedTeamAccess();

    const firstClient = createClient();
    const secondClient = createClient();

    try {
      await waitForConnection(firstClient);

      await registerClient(firstClient, {
        deviceId: "operator-device-1",
        auctionSessionId,
        auctionSessionTeamId,
        role: "OPERATOR",
        pin: "1234"
      });

      await waitForConnection(secondClient);

      const errorPayloadPromise =
        waitForRealtimeError(secondClient);

      secondClient.emit("realtime:register", {
        deviceId: "operator-device-2",
        auctionSessionId,
        auctionSessionTeamId,
        role: "OPERATOR",
        pin: "1234"
      });

      await expect(
        errorPayloadPromise
      ).resolves.toEqual({
        code: "OPERATOR_ALREADY_CONNECTED",
        message:
          "An operator is already connected for this auction session team"
      });
    } finally {
      firstClient.disconnect();
      secondClient.disconnect();
    }
  });

  it("allows multiple observers for the same team", async () => {
    const {
      auctionSessionId,
      auctionSessionTeamId
    } = await seedTeamAccess();

    const firstClient = createClient();
    const secondClient = createClient();

    try {
      await waitForConnection(firstClient);

      const firstRegistration =
        await registerClient(firstClient, {
          deviceId: "observer-device-1",
          auctionSessionId,
          auctionSessionTeamId,
          role: "OBSERVER",
          pin: "1234"
        });

      await waitForConnection(secondClient);

      const secondRegistration =
        await registerClient(secondClient, {
          deviceId: "observer-device-2",
          auctionSessionId,
          auctionSessionTeamId,
          role: "OBSERVER",
          pin: "1234"
        });

      expect(firstRegistration.role).toBe(
        "OBSERVER"
      );

      expect(secondRegistration.role).toBe(
        "OBSERVER"
      );

      expect(firstRegistration.socketId).not.toBe(
        secondRegistration.socketId
      );
    } finally {
      firstClient.disconnect();
      secondClient.disconnect();
    }
  });

  it("sends the authoritative snapshot after registration", async () => {
    const {
      auctionSessionId,
      auctionSessionTeamId
    } = await seedTeamAccess({
      stateVersion: 7
    });

    const client = createClient();

    try {
      await waitForConnection(client);

      const eventOrder: string[] = [];

      const registeredPromise =
        new Promise<RealtimeRegisteredPayload>(
          (resolve) => {
            client.once(
              "realtime:registered",
              (payload) => {
                eventOrder.push(
                  "realtime:registered"
                );

                resolve(payload);
              }
            );
          }
        );

      const snapshotPromise =
        new Promise<RealtimeAuctionSnapshot>(
          (resolve) => {
            client.once(
              "auction:snapshot",
              (payload) => {
                eventOrder.push(
                  "auction:snapshot"
                );

                resolve(payload);
              }
            );
          }
        );

      client.emit("realtime:register", {
        deviceId: "snapshot-device",
        auctionSessionId,
        auctionSessionTeamId,
        role: "OBSERVER",
        pin: "1234"
      });

      const [
        registered,
        snapshot
      ] = await Promise.all([
        registeredPromise,
        snapshotPromise
      ]);

      expect(registered.role).toBe(
        "OBSERVER"
      );

      expect(eventOrder).toEqual([
        "realtime:registered",
        "auction:snapshot"
      ]);

      expect(snapshot.stateVersion).toBe(7);

      expect(snapshot.session).toEqual({
        id: auctionSessionId,
        leagueId: "league-1",
        season: "2026/2027",
        editionNumber: 1,
        status: "SETUP",
        initialCredits: 330,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(snapshot.sessionTeams).toEqual([
        {
          id: auctionSessionTeamId,
          auctionSessionId,
          teamId: "team-1",
          tableOrder: 1,
          renewalCredits: 0,
          remainingCredits: 330
        }
      ]);

      expect(
        snapshot.operationalAuctionCall
      ).toBeNull();
    } finally {
      client.disconnect();
    }
  });

});
