import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

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
  "auction session suspension backup integration",
  () => {
    const requestConfirmedAwardBackup =
      vi.fn()
        .mockResolvedValue(undefined);

    const requestSuspendedSessionBackup =
      vi.fn()
        .mockResolvedValue(undefined);

    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp({
        auctionBackupRequester: {
          requestConfirmedAwardBackup,
          requestSuspendedSessionBackup,
          requestManualAssignmentBackup:
            vi.fn(),
          requestTechnicalCorrectionBackup:
            vi.fn()
        }
      });
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "requests backup once after suspend, not on replay or resume",
      async () => {
        const leagueId =
          "league-suspension-backup";

        const auctionSessionId =
          "session-suspension-backup";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Suspension Backup League",
          normalizedName:
            "suspension backup league"
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

        const suspendRequest = {
          method: "POST" as const,
          url:
            "/api/auction-sessions/" +
            auctionSessionId +
            "/commands/suspend",
          payload: {
            commandId:
              "suspension-backup-command",
            stateVersion: 0,
            reason: "PIZZA_BREAK"
          }
        };

        const first =
          await app.inject(
            suspendRequest
          );

        expect(
          first.statusCode
        ).toBe(200);

        expect(
          first.json()
        ).toMatchObject({
          stateVersion: 1,
          idempotentReplay: false,
          data: {
            id: auctionSessionId,
            status: "SUSPENDED",
            suspensionReason:
              "PIZZA_BREAK"
          }
        });

        expect(
          requestSuspendedSessionBackup
        ).toHaveBeenCalledTimes(1);

        expect(
          requestSuspendedSessionBackup
        ).toHaveBeenCalledWith({
          auctionSessionId
        });

        const replay =
          await app.inject(
            suspendRequest
          );

        expect(
          replay.statusCode
        ).toBe(200);

        expect(
          replay.json()
        ).toMatchObject({
          stateVersion: 1,
          idempotentReplay: true
        });

        expect(
          requestSuspendedSessionBackup
        ).toHaveBeenCalledTimes(1);

        const resume =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              auctionSessionId +
              "/commands/resume",
            payload: {
              commandId:
                "resume-backup-command",
              stateVersion: 1
            }
          });

        expect(
          resume.statusCode
        ).toBe(200);

        expect(
          resume.json()
        ).toMatchObject({
          stateVersion: 2,
          idempotentReplay: false,
          data: {
            id: auctionSessionId,
            status: "RUNNING",
            suspensionReason: null
          }
        });

        expect(
          requestSuspendedSessionBackup
        ).toHaveBeenCalledTimes(1);

        expect(
          requestConfirmedAwardBackup
        ).not.toHaveBeenCalled();
      }
    );
  }
);
