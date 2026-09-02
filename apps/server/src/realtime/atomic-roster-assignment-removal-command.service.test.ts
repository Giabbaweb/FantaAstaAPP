import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AtomicRosterAssignmentRemovalCommandService
} from "./atomic-roster-assignment-removal-command.service.js";

describe(
  "AtomicRosterAssignmentRemovalCommandService",
  () => {
    function createFixture() {
      const execute =
        vi.fn();

      const backupRequester = {
        requestTechnicalCorrectionBackup:
          vi.fn(
            async () => undefined
          )
      };

      const onBackupError =
        vi.fn();

      const service =
        new AtomicRosterAssignmentRemovalCommandService(
          {
            execute
          },
          backupRequester,
          onBackupError
        );

      return {
        execute,
        backupRequester,
        onBackupError,
        service
      };
    }

    it(
      "maps metadata actor comment and removal to the executor",
      async () => {
        const {
          execute,
          service
        } = createFixture();

        execute.mockResolvedValue({
          removal: {
            removed: {},
            remainingCreditsAfterRemoval: 100
          },
          stateVersion: 4,
          idempotentReplay: false
        });

        await service.remove(
          {
            commandId:
              "roster-removal-command-1",
            stateVersion: 3
          },
          {
            name: "Gianfranco",
            role: "AUCTIONEER"
          },
          {
            auctionSessionId:
              "session-1",
            rosterEntryId:
              "roster-entry-1"
          },
          "Rimozione assegnazione errata"
        );

        expect(execute).toHaveBeenCalledTimes(1);

        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            commandId:
              "roster-removal-command-1",
            commandType:
              "REMOVE_ROSTER_ASSIGNMENT",
            expectedStateVersion: 3,
            actorName:
              "Gianfranco",
            actorRole:
              "AUCTIONEER",
            comment:
              "Rimozione assegnazione errata",
            removal: {
              auctionSessionId:
                "session-1",
              rosterEntryId:
                "roster-entry-1"
            }
          })
        );

        const call =
          execute.mock.calls[0]?.[0];

        expect(
          JSON.parse(
            call.requestFingerprint
          )
        ).toEqual({
          commandType:
            "REMOVE_ROSTER_ASSIGNMENT",
          actorName:
            "Gianfranco",
          actorRole:
            "AUCTIONEER",
          comment:
            "Rimozione assegnazione errata",
          removal: {
            auctionSessionId:
              "session-1",
            rosterEntryId:
              "roster-entry-1"
          }
        });
      }
    );

    it(
      "requests a TECHNICAL_CORRECTION backup only after a non-replayed removal",
      async () => {
        const {
          execute,
          backupRequester,
          service
        } = createFixture();

        execute.mockResolvedValue({
          removal: {
            removed: {},
            remainingCreditsAfterRemoval: 100
          },
          stateVersion: 4,
          idempotentReplay: false
        });

        await service.remove(
          {
            commandId:
              "roster-removal-backup-1",
            stateVersion: 3
          },
          {
            name: "Gianfranco",
            role: "AUCTIONEER"
          },
          {
            auctionSessionId:
              "session-1",
            rosterEntryId:
              "roster-entry-1"
          },
          "Backup removal"
        );

        expect(
          backupRequester
            .requestTechnicalCorrectionBackup
        ).toHaveBeenCalledTimes(1);

        expect(
          backupRequester
            .requestTechnicalCorrectionBackup
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1"
        });
      }
    );

    it(
      "does not request a technical correction backup for an idempotent replay",
      async () => {
        const {
          execute,
          backupRequester,
          service
        } = createFixture();

        execute.mockResolvedValue({
          removal: {
            removed: {},
            remainingCreditsAfterRemoval: 100
          },
          stateVersion: 4,
          idempotentReplay: true
        });

        await service.remove(
          {
            commandId:
              "roster-removal-replay-1",
            stateVersion: 3
          },
          {
            name: "Gianfranco",
            role: "AUCTIONEER"
          },
          {
            auctionSessionId:
              "session-1",
            rosterEntryId:
              "roster-entry-1"
          },
          "Replay removal"
        );

        expect(
          backupRequester
            .requestTechnicalCorrectionBackup
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "keeps a committed roster removal successful when backup fails",
      async () => {
        const {
          execute,
          backupRequester,
          onBackupError,
          service
        } = createFixture();

        const executorResult = {
          removal: {
            removed: {},
            remainingCreditsAfterRemoval: 100
          },
          stateVersion: 4,
          idempotentReplay: false
        };

        const backupError =
          new Error(
            "technical backup failed"
          );

        execute.mockResolvedValue(
          executorResult
        );

        backupRequester
          .requestTechnicalCorrectionBackup
          .mockRejectedValue(
            backupError
          );

        await expect(
          service.remove(
            {
              commandId:
                "roster-removal-backup-failure",
              stateVersion: 3
            },
            {
              name: "Gianfranco",
              role: "AUCTIONEER"
            },
            {
              auctionSessionId:
                "session-1",
              rosterEntryId:
                "roster-entry-1"
            },
            "Failure removal"
          )
        ).resolves.toEqual(
          executorResult
        );

        expect(
          onBackupError
        ).toHaveBeenCalledWith({
          auctionSessionId:
            "session-1",
          error:
            backupError
        });
      }
    );
  }
);
