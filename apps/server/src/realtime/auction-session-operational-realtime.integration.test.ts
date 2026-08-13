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
  RealtimeAuctionEvent,
  RealtimeAuctionSnapshot,
  RealtimeRegisteredPayload
} from "@fantaastaapp/contracts";

import {
  buildApp
} from "../app.js";
import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  leagues
} from "../db/schema/index.js";

describe(
  "auction session operational realtime integration",
  () => {
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

      await new Promise<void>(
        (resolve, reject) => {
          client.once(
            "connect",
            resolve
          );
          client.once(
            "connect_error",
            reject
          );
        }
      );
    }

    function waitForEvent(
      client: Socket
    ): Promise<RealtimeAuctionEvent> {
      return new Promise(
        (resolve) => {
          client.once(
            "auction:event",
            resolve
          );
        }
      );
    }

    function waitForSnapshot(
      client: Socket
    ): Promise<RealtimeAuctionSnapshot> {
      return new Promise(
        (resolve) => {
          client.once(
            "auction:snapshot",
            resolve
          );
        }
      );
    }

    it(
      "publishes suspension and resume to a public display",
      async () => {
        const leagueId =
          "league-operational-realtime";

        const auctionSessionId =
          "session-operational-realtime";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Operational Realtime League",
          normalizedName:
            "operational realtime league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: auctionSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            status: "RUNNING",
            stateVersion: 0
          });

        const client = createClient();

        try {
          await waitForConnection(client);

          const registeredPromise =
            new Promise<
              RealtimeRegisteredPayload
            >((resolve) => {
              client.once(
                "realtime:registered",
                resolve
              );
            });

          const initialSnapshotPromise =
            waitForSnapshot(client);

          client.emit(
            "realtime:register",
            {
              kind: "PUBLIC_DISPLAY",
              deviceId:
                "operational-display",
              auctionSessionId
            }
          );

          const [
            registered,
            initialSnapshot
          ] = await Promise.all([
            registeredPromise,
            initialSnapshotPromise
          ]);

          expect(registered).toMatchObject({
            kind: "PUBLIC_DISPLAY",
            auctionSessionId
          });

          expect(
            initialSnapshot.session.status
          ).toBe("RUNNING");

          expect(
            initialSnapshot.session
              .suspensionReason
          ).toBeNull();

          expect(
            initialSnapshot.stateVersion
          ).toBe(0);

          const suspendEventPromise =
            waitForEvent(client);

          const suspendSnapshotPromise =
            waitForSnapshot(client);

          const suspendResponse =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                auctionSessionId +
                "/commands/suspend",
              payload: {
                commandId:
                  "operational-suspend-1",
                stateVersion: 0,
                reason: "PIZZA_BREAK"
              }
            });

          expect(
            suspendResponse.statusCode
          ).toBe(200);

          expect(
            suspendResponse.json()
          ).toEqual({
            data: expect.objectContaining({
              id: auctionSessionId,
              status: "SUSPENDED",
              suspensionReason:
                "PIZZA_BREAK"
            }),
            stateVersion: 1,
            idempotentReplay: false,
            error: null
          });

          const [
            suspendEvent,
            suspendSnapshot
          ] = await Promise.all([
            suspendEventPromise,
            suspendSnapshotPromise
          ]);

          expect(
            suspendEvent
          ).toEqual({
            type: "SESSION_SUSPENDED",
            auctionSessionId,
            auctionCallId: null,
            occurredAt:
              expect.any(String),
            payload: {
              suspensionReason:
                "PIZZA_BREAK"
            }
          });

          expect(
            suspendSnapshot.stateVersion
          ).toBe(1);

          expect(
            suspendSnapshot.session.status
          ).toBe("SUSPENDED");

          expect(
            suspendSnapshot.session
              .suspensionReason
          ).toBe("PIZZA_BREAK");

          const replayEvents:
            RealtimeAuctionEvent[] = [];

          const replaySnapshots:
            RealtimeAuctionSnapshot[] = [];

          const onReplayEvent = (
            event: RealtimeAuctionEvent
          ) => {
            replayEvents.push(event);
          };

          const onReplaySnapshot = (
            snapshot:
              RealtimeAuctionSnapshot
          ) => {
            replaySnapshots.push(
              snapshot
            );
          };

          client.on(
            "auction:event",
            onReplayEvent
          );

          client.on(
            "auction:snapshot",
            onReplaySnapshot
          );

          const replayResponse =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                auctionSessionId +
                "/commands/suspend",
              payload: {
                commandId:
                  "operational-suspend-1",
                stateVersion: 0,
                reason: "PIZZA_BREAK"
              }
            });

          expect(
            replayResponse.statusCode
          ).toBe(200);

          expect(
            replayResponse.json()
          ).toEqual({
            data: expect.objectContaining({
              id: auctionSessionId,
              status: "SUSPENDED",
              suspensionReason:
                "PIZZA_BREAK"
            }),
            stateVersion: 1,
            idempotentReplay: true,
            error: null
          });

          await new Promise<void>(
            (resolve) => {
              setTimeout(resolve, 50);
            }
          );

          client.off(
            "auction:event",
            onReplayEvent
          );

          client.off(
            "auction:snapshot",
            onReplaySnapshot
          );

          expect(replayEvents).toEqual([]);
          expect(replaySnapshots).toEqual(
            []
          );

          const resumeEventPromise =
            waitForEvent(client);

          const resumeSnapshotPromise =
            waitForSnapshot(client);

          const resumeResponse =
            await app.inject({
              method: "POST",
              url:
                "/api/auction-sessions/" +
                auctionSessionId +
                "/commands/resume",
              payload: {
                commandId:
                  "operational-resume-1",
                stateVersion: 1
              }
            });

          expect(
            resumeResponse.statusCode
          ).toBe(200);

          expect(
            resumeResponse.json()
          ).toEqual({
            data: expect.objectContaining({
              id: auctionSessionId,
              status: "RUNNING",
              suspensionReason: null
            }),
            stateVersion: 2,
            idempotentReplay: false,
            error: null
          });

          const [
            resumeEvent,
            resumeSnapshot
          ] = await Promise.all([
            resumeEventPromise,
            resumeSnapshotPromise
          ]);

          expect(
            resumeEvent
          ).toEqual({
            type: "SESSION_RESUMED",
            auctionSessionId,
            auctionCallId: null,
            occurredAt:
              expect.any(String),
            payload: {}
          });

          expect(
            resumeSnapshot.stateVersion
          ).toBe(2);

          expect(
            resumeSnapshot.session.status
          ).toBe("RUNNING");

          expect(
            resumeSnapshot.session
              .suspensionReason
          ).toBeNull();
        } finally {
          client.disconnect();
        }
      }
    );
  }
);
