import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  leagues
} from "../db/schema/index.js";
import {
  buildApp
} from "../app.js";

describe(
  "auction session completion backup integration",
  () => {
    const requestCompletedSessionBackup =
      vi.fn()
        .mockResolvedValue(undefined);

    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp({
        auctionBackupRequester: {
          requestConfirmedAwardBackup:
            vi.fn(),
          requestSuspendedSessionBackup:
            vi.fn(),
          requestManualAssignmentBackup:
            vi.fn(),
          requestTechnicalCorrectionBackup:
            vi.fn(),
          requestCompletedSessionBackup
        }
      });
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "requests completion backup once after complete, not on idempotent replay",
      async () => {
        const leagueId =
          "league-completion-backup";

        const auctionSessionId =
          "session-completion-backup";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Completion Backup League",
          normalizedName:
            "completion backup league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: auctionSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "RUNNING",
            stateVersion: 4
          });

        const request = {
          method: "POST" as const,
          url:
            "/api/auction-sessions/" +
            auctionSessionId +
            "/commands/complete",
          payload: {
            commandId:
              "completion-backup-command",
            stateVersion: 4
          }
        };

        const firstResponse =
          await app.inject(request);

        expect(firstResponse.statusCode)
          .toBe(200);

        expect(firstResponse.json())
          .toEqual({
            data:
              expect.objectContaining({
                id: auctionSessionId,
                status: "COMPLETED"
              }),
            error: null
          });

        expect(
          requestCompletedSessionBackup
        ).toHaveBeenCalledTimes(1);

        expect(
          requestCompletedSessionBackup
        ).toHaveBeenCalledWith({
          auctionSessionId
        });

        const retryResponse =
          await app.inject(request);

        expect(retryResponse.statusCode)
          .toBe(409);

        expect(retryResponse.json())
          .toEqual({
            data: null,
            error:
              expect.objectContaining({
                code:
                  "INVALID_STATUS_TRANSITION"
              })
          });

        expect(
          requestCompletedSessionBackup
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "keeps completion committed when backup fails",
      async () => {
        requestCompletedSessionBackup
          .mockRejectedValueOnce(
            new Error(
              "completion backup failed"
            )
          );

        const leagueId =
          "league-completion-backup-failure";

        const auctionSessionId =
          "session-completion-backup-failure";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Completion Backup Failure League",
          normalizedName:
            "completion backup failure league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: auctionSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "RUNNING",
            stateVersion: 7
          });

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              auctionSessionId +
              "/commands/complete",
            payload: {
              commandId:
                "completion-backup-failure-command",
              stateVersion: 7
            }
          });

        expect(response.statusCode)
          .toBe(200);

        expect(response.json())
          .toEqual({
            data:
              expect.objectContaining({
                id: auctionSessionId,
                status: "COMPLETED"
              }),
            error: null
          });

        const persistedSession =
          await db.query.auctionSessions
            .findFirst({
              where: (
                auctionSessions,
                { eq }
              ) =>
                eq(
                  auctionSessions.id,
                  auctionSessionId
                )
            });

        expect(persistedSession)
          .toEqual(
            expect.objectContaining({
              id: auctionSessionId,
              status: "COMPLETED"
            })
          );
      }
    );

    it(
      "does not request completion backup for an invalid complete command",
      async () => {
        const leagueId =
          "league-invalid-completion-backup";

        const auctionSessionId =
          "session-invalid-completion-backup";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Invalid Completion Backup League",
          normalizedName:
            "invalid completion backup league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: auctionSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "SETUP",
            stateVersion: 2
          });

        const callsBefore =
          requestCompletedSessionBackup
            .mock.calls.length;

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              auctionSessionId +
              "/commands/complete",
            payload: {
              commandId:
                "invalid-completion-backup-command",
              stateVersion: 2
            }
          });

        expect(response.statusCode)
          .toBe(409);

        expect(
          requestCompletedSessionBackup
            .mock.calls.length
        ).toBe(callsBefore);
      }
    );

    it(
      "does not request completion backup when reopening a closed session",
      async () => {
        const leagueId =
          "league-reopen-no-completion-backup";

        const auctionSessionId =
          "session-reopen-no-completion-backup";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Reopen No Completion Backup League",
          normalizedName:
            "reopen no completion backup league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: auctionSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            maximumInitialRosterEntries: 11,
            status: "CLOSED",
            stateVersion: 6
          });

        const callsBefore =
          requestCompletedSessionBackup
            .mock.calls.length;

        const response =
          await app.inject({
            method: "POST",
            url:
              "/api/auction-sessions/" +
              auctionSessionId +
              "/commands/reopen",
            payload: {
              commandId:
                "reopen-no-completion-backup-command",
              stateVersion: 6
            }
          });

        expect(response.statusCode)
          .toBe(200);

        expect(response.json())
          .toEqual(
            expect.objectContaining({
              data:
                expect.objectContaining({
                  id: auctionSessionId,
                  status: "COMPLETED"
                }),
              stateVersion: 7,
              idempotentReplay: false,
              error: null
            })
          );

        expect(
          requestCompletedSessionBackup
            .mock.calls.length
        ).toBe(callsBefore);
      }
    );
  }
);
