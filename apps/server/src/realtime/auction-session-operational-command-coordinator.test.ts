import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  AuctionSession
} from "@fantaastaapp/contracts";

import {
  AuctionSessionOperationalCommandCoordinator
} from "./auction-session-operational-command-coordinator.js";

describe(
  "AuctionSessionOperationalCommandCoordinator",
  () => {
    const readySession: AuctionSession = {
      id: "session-1",
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 35,
      status: "READY",
      suspensionReason: null,
      initialCredits: 330,
      maximumInitialRosterEntries: 11,
      remoteBaseUrl: null,
      createdAt:
        "2026-08-13T18:00:00.000Z",
      updatedAt:
        "2026-08-13T18:30:00.000Z"
    };

    const suspendedSession: AuctionSession = {
      id: "session-1",
      leagueId: "league-1",
      season: "2026/2027",
      editionNumber: 35,
      status: "SUSPENDED",
      suspensionReason: "PIZZA_BREAK",
      initialCredits: 330,
      maximumInitialRosterEntries: 11,
      remoteBaseUrl: null,
      createdAt:
        "2026-08-13T18:00:00.000Z",
      updatedAt:
        "2026-08-13T19:00:00.000Z"
    };

    const runningSession: AuctionSession = {
      ...suspendedSession,
      status: "RUNNING",
      suspensionReason: null,
      updatedAt:
        "2026-08-13T19:30:00.000Z"
    };

    const startResult = {
      session: {
        ...readySession,
        status: "RUNNING" as const,
        updatedAt:
          "2026-08-13T18:45:00.000Z"
      },
      stateVersion: 4,
      idempotentReplay: false
    };

    const suspendResult = {
      session: suspendedSession,
      stateVersion: 5,
      idempotentReplay: false
    };

    const resumeResult = {
      session: runningSession,
      stateVersion: 6,
      idempotentReplay: false
    };

    const reopenedSession: AuctionSession = {
      ...runningSession,
      status: "COMPLETED",
      suspensionReason: null,
      updatedAt:
        "2026-08-13T20:00:00.000Z"
    };

    const reopenResult = {
      session: reopenedSession,
      stateVersion: 7,
      idempotentReplay: false
    };

    const startInput = {
      auctionSessionId: "session-1",
      commandId: "start-command-1",
      expectedStateVersion: 3
    };

    const suspendInput = {
      auctionSessionId: "session-1",
      commandId: "suspend-command-1",
      expectedStateVersion: 4,
      reason: "PIZZA_BREAK" as const
    };

    const resumeInput = {
      auctionSessionId: "session-1",
      commandId: "resume-command-1",
      expectedStateVersion: 5
    };

    const reopenInput = {
      auctionSessionId: "session-1",
      commandId: "reopen-command-1",
      expectedStateVersion: 6
    };

    function createFixture() {
      const service = {
        start:
          vi.fn()
            .mockResolvedValue(
              startResult
            ),
        suspend:
          vi.fn()
            .mockResolvedValue(
              suspendResult
            ),
        resume:
          vi.fn()
            .mockResolvedValue(
              resumeResult
            ),
        reopen:
          vi.fn()
            .mockResolvedValue(
              reopenResult
            )
      };

      const dispatcher = {
        dispatch:
          vi.fn()
            .mockResolvedValue(
              undefined
            )
      };

      const snapshotDispatcher = {
        dispatch:
          vi.fn()
            .mockResolvedValue(
              undefined
            )
      };

      const backupRequester = {
        requestSuspendedSessionBackup:
          vi.fn()
            .mockResolvedValue(
              undefined
            )
      };

      const onDispatchFailure =
        vi.fn();

      const coordinator =
        new AuctionSessionOperationalCommandCoordinator(
          service,
          dispatcher,
          snapshotDispatcher,
          backupRequester,
          onDispatchFailure
        );

      return {
        service,
        dispatcher,
        snapshotDispatcher,
        backupRequester,
        onDispatchFailure,
        coordinator
      };
    }

    it(
      "dispatches start event and snapshot after start",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          coordinator
        } = createFixture();

        await expect(
          coordinator.start(
            startInput
          )
        ).resolves.toEqual(
          startResult
        );

        expect(
          service.start
        ).toHaveBeenCalledWith(
          startInput
        );

        expect(
          dispatcher.dispatch
        ).toHaveBeenCalledWith({
          type:
            "SESSION_STARTED",
          auctionSessionId:
            "session-1"
        });

        expect(
          snapshotDispatcher.dispatch
        ).toHaveBeenCalledWith(
          "session-1"
        );
      }
    );

    it(
      "does not dispatch an idempotent start replay",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          coordinator
        } = createFixture();

        service.start
          .mockResolvedValueOnce({
            ...startResult,
            idempotentReplay: true
          });

        await expect(
          coordinator.start(
            startInput
          )
        ).resolves.toMatchObject({
          idempotentReplay: true
        });

        expect(
          dispatcher.dispatch
        ).not.toHaveBeenCalled();

        expect(
          snapshotDispatcher.dispatch
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "dispatches suspension event and snapshot after suspend",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          coordinator
        } = createFixture();

        await expect(
          coordinator.suspend(
            suspendInput
          )
        ).resolves.toEqual(
          suspendResult
        );

        expect(
          service.suspend
        ).toHaveBeenCalledWith(
          suspendInput
        );

        expect(
          dispatcher.dispatch
        ).toHaveBeenCalledWith({
          type:
            "SESSION_SUSPENDED",
          auctionSessionId:
            "session-1",
          payload: {
            suspensionReason:
              "PIZZA_BREAK"
          }
        });

        expect(
          snapshotDispatcher.dispatch
        ).toHaveBeenCalledWith(
          "session-1"
        );
      }
    );

    it(
      "dispatches resume event and snapshot after resume",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          coordinator
        } = createFixture();

        await expect(
          coordinator.resume(
            resumeInput
          )
        ).resolves.toEqual(
          resumeResult
        );

        expect(
          service.resume
        ).toHaveBeenCalledWith(
          resumeInput
        );

        expect(
          dispatcher.dispatch
        ).toHaveBeenCalledWith({
          type:
            "SESSION_RESUMED",
          auctionSessionId:
            "session-1"
        });

        expect(
          snapshotDispatcher.dispatch
        ).toHaveBeenCalledWith(
          "session-1"
        );
      }
    );

    it(
      "dispatches reopen event and snapshot after reopen",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          backupRequester,
          coordinator
        } = createFixture();

        await expect(
          coordinator.reopen(
            reopenInput
          )
        ).resolves.toEqual(
          reopenResult
        );

        expect(
          service.reopen
        ).toHaveBeenCalledWith(
          reopenInput
        );

        expect(
          dispatcher.dispatch
        ).toHaveBeenCalledWith({
          type:
            "SESSION_REOPENED",
          auctionSessionId:
            "session-1"
        });

        expect(
          snapshotDispatcher.dispatch
        ).toHaveBeenCalledWith(
          "session-1"
        );

        expect(
          backupRequester
            .requestSuspendedSessionBackup
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not dispatch an idempotent reopen replay",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          backupRequester,
          coordinator
        } = createFixture();

        service.reopen
          .mockResolvedValueOnce({
            ...reopenResult,
            idempotentReplay: true
          });

        await expect(
          coordinator.reopen(
            reopenInput
          )
        ).resolves.toMatchObject({
          idempotentReplay: true
        });

        expect(
          dispatcher.dispatch
        ).not.toHaveBeenCalled();

        expect(
          snapshotDispatcher.dispatch
        ).not.toHaveBeenCalled();

        expect(
          backupRequester
            .requestSuspendedSessionBackup
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not dispatch an idempotent replay",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          coordinator
        } = createFixture();

        service.suspend
          .mockResolvedValueOnce({
            ...suspendResult,
            idempotentReplay: true
          });

        await expect(
          coordinator.suspend(
            suspendInput
          )
        ).resolves.toMatchObject({
          idempotentReplay: true
        });

        expect(
          dispatcher.dispatch
        ).not.toHaveBeenCalled();

        expect(
          snapshotDispatcher.dispatch
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not dispatch when the command fails",
      async () => {
        const {
          service,
          dispatcher,
          snapshotDispatcher,
          coordinator
        } = createFixture();

        service.suspend
          .mockRejectedValueOnce(
            new Error(
              "Command failed"
            )
          );

        await expect(
          coordinator.suspend(
            suspendInput
          )
        ).rejects.toThrow(
          "Command failed"
        );

        expect(
          dispatcher.dispatch
        ).not.toHaveBeenCalled();

        expect(
          snapshotDispatcher.dispatch
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns persisted result when event dispatch fails",
      async () => {
        const {
          dispatcher,
          snapshotDispatcher,
          onDispatchFailure,
          coordinator
        } = createFixture();

        const error =
          new Error(
            "Event publication failed"
          );

        dispatcher.dispatch
          .mockRejectedValueOnce(
            error
          );

        await expect(
          coordinator.suspend(
            suspendInput
          )
        ).resolves.toEqual(
          suspendResult
        );

        expect(
          onDispatchFailure
        ).toHaveBeenCalledWith({
          stage: "EVENT",
          type:
            "SESSION_SUSPENDED",
          auctionSessionId:
            "session-1",
          error
        });

        expect(
          snapshotDispatcher.dispatch
        ).toHaveBeenCalledWith(
          "session-1"
        );
      }
    );

    it(
      "requests a backup after a suspended session",
      async () => {
        const {
          backupRequester,
          coordinator
        } = createFixture();

        await expect(
          coordinator.suspend(
            suspendInput
          )
        ).resolves.toEqual(
          suspendResult
        );

        expect(
          backupRequester
            .requestSuspendedSessionBackup
        ).toHaveBeenCalledTimes(1);

        expect(
          backupRequester
            .requestSuspendedSessionBackup
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1"
        });
      }
    );

    it(
      "does not request a backup for an idempotent suspend replay",
      async () => {
        const {
          service,
          backupRequester,
          coordinator
        } = createFixture();

        service.suspend
          .mockResolvedValueOnce({
            ...suspendResult,
            idempotentReplay: true
          });

        await expect(
          coordinator.suspend(
            suspendInput
          )
        ).resolves.toMatchObject({
          idempotentReplay: true
        });

        expect(
          backupRequester
            .requestSuspendedSessionBackup
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not request a suspension backup on resume",
      async () => {
        const {
          backupRequester,
          coordinator
        } = createFixture();

        await coordinator.resume(
          resumeInput
        );

        expect(
          backupRequester
            .requestSuspendedSessionBackup
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "reports backup failure without failing the suspended command",
      async () => {
        const {
          backupRequester,
          onDispatchFailure,
          coordinator
        } = createFixture();

        const error =
          new Error(
            "Backup failed"
          );

        backupRequester
          .requestSuspendedSessionBackup
          .mockRejectedValueOnce(
            error
          );

        await expect(
          coordinator.suspend(
            suspendInput
          )
        ).resolves.toEqual(
          suspendResult
        );

        expect(
          onDispatchFailure
        ).toHaveBeenCalledWith({
          stage: "BACKUP",
          type:
            "SESSION_SUSPENDED",
          auctionSessionId:
            "session-1",
          error
        });
      }
    );

    it(
      "reports snapshot failure without failing the command",
      async () => {
        const {
          snapshotDispatcher,
          onDispatchFailure,
          coordinator
        } = createFixture();

        const error =
          new Error(
            "Snapshot publication failed"
          );

        snapshotDispatcher.dispatch
          .mockRejectedValueOnce(
            error
          );

        await expect(
          coordinator.resume(
            resumeInput
          )
        ).resolves.toEqual(
          resumeResult
        );

        expect(
          onDispatchFailure
        ).toHaveBeenCalledWith({
          stage: "SNAPSHOT",
          type:
            "SESSION_RESUMED",
          auctionSessionId:
            "session-1",
          error
        });
      }
    );
  }
);
