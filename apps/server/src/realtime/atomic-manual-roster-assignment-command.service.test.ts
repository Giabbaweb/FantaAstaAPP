import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AtomicManualRosterAssignmentCommandService
} from "./atomic-manual-roster-assignment-command.service.js";

describe(
  "AtomicManualRosterAssignmentCommandService",
  () => {
    function createFixture() {
      const executor = {
        execute: vi.fn()
      };

      const service =
        new AtomicManualRosterAssignmentCommandService(
          executor
        );

      return {
        executor,
        service
      };
    }

    const assignment = {
      auctionSessionId:
        "session-1",
      auctionSessionTeamId:
        "session-team-1",
      playerId:
        "player-1",
      acquisitionCost: 30,
      contractYear: 3 as const
    };

    it(
      "maps metadata actor reason comment and assignment to the atomic executor",
      async () => {
        const {
          executor,
          service
        } = createFixture();

        const executorResult = {
          rosterEntry: {
            id:
              "roster-entry-1",
            auctionSessionTeamId:
              assignment.auctionSessionTeamId,
            playerId:
              assignment.playerId,
            acquisitionCost:
              assignment.acquisitionCost,
            contractYear:
              assignment.contractYear,
            source:
              "MANUAL_ASSIGNMENT" as const,
            createdAt:
              "2026-08-14T22:00:00.000Z",
            updatedAt:
              "2026-08-14T22:00:00.000Z"
          },
          stateVersion: 4,
          idempotentReplay: false
        };

        executor.execute.mockResolvedValue(
          executorResult
        );

        const result =
          await service.add(
            {
              commandId:
                "command-1",
              stateVersion: 3
            },
            {
              name:
                "Auctioneer",
              role:
                "AUCTIONEER"
            },
            assignment,
            "OPTION_EXERCISED_MANUALLY",
            "Opzione esercitata dal Presidente"
          );

        expect(executor.execute)
          .toHaveBeenCalledWith({
            commandId:
              "command-1",
            commandType:
              "ADD_MANUAL_ROSTER_ASSIGNMENT",
            expectedStateVersion: 3,
            requestFingerprint:
              JSON.stringify({
                commandType:
                  "ADD_MANUAL_ROSTER_ASSIGNMENT",
                actorName:
                  "Auctioneer",
                actorRole:
                  "AUCTIONEER",
                manualAssignmentReason:
                  "OPTION_EXERCISED_MANUALLY",
                comment:
                  "Opzione esercitata dal Presidente",
                assignment: {
                  auctionSessionId:
                    "session-1",
                  auctionSessionTeamId:
                    "session-team-1",
                  playerId:
                    "player-1",
                  acquisitionCost: 30,
                  contractYear: 3
                }
              }),
            actorName:
              "Auctioneer",
            actorRole:
              "AUCTIONEER",
            manualAssignmentReason:
              "OPTION_EXERCISED_MANUALLY",
            comment:
              "Opzione esercitata dal Presidente",
            assignment
          });

        expect(result).toEqual(
          executorResult
        );
      }
    );

    it(
      "includes manual assignment reason in the request fingerprint",
      async () => {
        const {
          executor,
          service
        } = createFixture();

        executor.execute.mockResolvedValue({
          rosterEntry: {
            id:
              "roster-entry-1",
            auctionSessionTeamId:
              assignment.auctionSessionTeamId,
            playerId:
              assignment.playerId,
            acquisitionCost:
              assignment.acquisitionCost,
            contractYear:
              assignment.contractYear,
            source:
              "MANUAL_ASSIGNMENT",
            createdAt:
              "2026-08-14T22:00:00.000Z",
            updatedAt:
              "2026-08-14T22:00:00.000Z"
          },
          stateVersion: 4,
          idempotentReplay: false
        });

        await service.add(
          {
            commandId:
              "command-2",
            stateVersion: 3
          },
          {
            name:
              "Administrator",
            role:
              "ADMINISTRATOR"
          },
          assignment,
          "OPTION_NO_EXTERNAL_BID",
          "Nessuna offerta esterna"
        );

        const firstCall =
          executor.execute.mock.calls[0]?.[0];

        expect(
          firstCall?.requestFingerprint
        ).toContain(
          "OPTION_NO_EXTERNAL_BID"
        );

        await service.add(
          {
            commandId:
              "command-3",
            stateVersion: 3
          },
          {
            name:
              "Administrator",
            role:
              "ADMINISTRATOR"
          },
          assignment,
          "OTHER",
          "Nessuna offerta esterna"
        );

        const secondCall =
          executor.execute.mock.calls[1]?.[0];

        expect(
          secondCall?.requestFingerprint
        ).not.toBe(
          firstCall?.requestFingerprint
        );
      }
    );

    it(
      "includes the mandatory comment in the request fingerprint",
      async () => {
        const {
          executor,
          service
        } = createFixture();

        executor.execute.mockResolvedValue({
          rosterEntry: {
            id:
              "roster-entry-1",
            auctionSessionTeamId:
              assignment.auctionSessionTeamId,
            playerId:
              assignment.playerId,
            acquisitionCost:
              assignment.acquisitionCost,
            contractYear:
              assignment.contractYear,
            source:
              "MANUAL_ASSIGNMENT",
            createdAt:
              "2026-08-14T22:00:00.000Z",
            updatedAt:
              "2026-08-14T22:00:00.000Z"
          },
          stateVersion: 4,
          idempotentReplay: false
        });

        await service.add(
          {
            commandId:
              "command-4",
            stateVersion: 3
          },
          {
            name:
              "Auctioneer",
            role:
              "AUCTIONEER"
          },
          assignment,
          "OTHER",
          "Prima motivazione"
        );

        await service.add(
          {
            commandId:
              "command-5",
            stateVersion: 3
          },
          {
            name:
              "Auctioneer",
            role:
              "AUCTIONEER"
          },
          assignment,
          "OTHER",
          "Seconda motivazione"
        );

        const firstFingerprint =
          executor.execute.mock.calls[0]?.[0]
            .requestFingerprint;

        const secondFingerprint =
          executor.execute.mock.calls[1]?.[0]
            .requestFingerprint;

        expect(
          secondFingerprint
        ).not.toBe(
          firstFingerprint
        );
      }
    );
  }
);
