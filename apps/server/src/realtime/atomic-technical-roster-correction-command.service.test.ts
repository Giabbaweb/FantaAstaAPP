import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AtomicTechnicalRosterCorrectionCommandService
} from "./atomic-technical-roster-correction-command.service.js";

describe(
  "AtomicTechnicalRosterCorrectionCommandService",
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
        new AtomicTechnicalRosterCorrectionCommandService(
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
      "maps metadata actor comment and correction to the executor",
      async () => {
        const {
          execute,
          service
        } = createFixture();

        execute.mockResolvedValue({
          correction: {
            before: {},
            after: {}
          },
          stateVersion: 4,
          idempotentReplay: false
        });

        await service.correct(
          {
            commandId:
              "technical-correction-command-1",
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
              "roster-entry-1",
            auctionSessionTeamId:
              "session-team-2",
            playerId:
              "player-2",
            acquisitionCost: 35,
            contractYear: 3
          },
          "Correzione tecnica"
        );

        expect(execute).toHaveBeenCalledTimes(1);

        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            commandId:
              "technical-correction-command-1",
            commandType:
              "TECHNICAL_ROSTER_CORRECTION",
            expectedStateVersion: 3,
            actorName:
              "Gianfranco",
            actorRole:
              "AUCTIONEER",
            comment:
              "Correzione tecnica",
            correction: {
              auctionSessionId:
                "session-1",
              rosterEntryId:
                "roster-entry-1",
              auctionSessionTeamId:
                "session-team-2",
              playerId:
                "player-2",
              acquisitionCost: 35,
              contractYear: 3
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
            "TECHNICAL_ROSTER_CORRECTION",
          actorName:
            "Gianfranco",
          actorRole:
            "AUCTIONEER",
          comment:
            "Correzione tecnica",
          correction: {
            auctionSessionId:
              "session-1",
            rosterEntryId:
              "roster-entry-1",
            auctionSessionTeamId:
              "session-team-2",
            playerId:
              "player-2",
            acquisitionCost: 35,
            contractYear: 3
          }
        });
      }
    );

    it(
      "requests a TECHNICAL_CORRECTION backup only after a non-replayed commit",
      async () => {
        const {
          execute,
          backupRequester,
          service
        } = createFixture();

        execute.mockResolvedValue({
          correction: {
            before: {},
            after: {}
          },
          stateVersion: 4,
          idempotentReplay: false
        });

        await service.correct(
          {
            commandId:
              "technical-backup-1",
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
              "roster-entry-1",
            auctionSessionTeamId:
              "session-team-2",
            playerId:
              "player-2",
            acquisitionCost: 35,
            contractYear: 3
          },
          "Backup correction"
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
          correction: {
            before: {},
            after: {}
          },
          stateVersion: 4,
          idempotentReplay: true
        });

        await service.correct(
          {
            commandId:
              "technical-replay-1",
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
              "roster-entry-1",
            auctionSessionTeamId:
              "session-team-2",
            playerId:
              "player-2",
            acquisitionCost: 35,
            contractYear: 3
          },
          "Replay correction"
        );

        expect(
          backupRequester
            .requestTechnicalCorrectionBackup
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "keeps a committed technical correction successful when backup fails",
      async () => {
        const {
          execute,
          backupRequester,
          onBackupError,
          service
        } = createFixture();

        const executorResult = {
          correction: {
            before: {},
            after: {}
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
          service.correct(
            {
              commandId:
                "technical-backup-failure",
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
                "roster-entry-1",
              auctionSessionTeamId:
                "session-team-2",
              playerId:
                "player-2",
              acquisitionCost: 35,
              contractYear: 3
            },
            "Failure correction"
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
