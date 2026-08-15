import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AtomicManualInitialRosterCommandService
} from "./atomic-manual-initial-roster-command.service.js";

describe(
  "AtomicManualInitialRosterCommandService",
  () => {
    function createFixture() {
      const executor = {
        execute: vi.fn()
      };

      const service =
        new AtomicManualInitialRosterCommandService(
          executor
        );

      return {
        executor,
        service
      };
    }

    const entry = {
      auctionSessionId: "session-1",
      auctionSessionTeamId: "session-team-1",
      playerId: "player-1",
      acquisitionCost: 25,
      contractYear: 2 as const
    };

    it("maps metadata, actor and entry to the atomic executor", async () => {
      const {
        executor,
        service
      } = createFixture();

      const executorResult = {
        rosterEntry: {
          id: "roster-entry-1",
          ...entry,
          source: "INITIAL_ROSTER" as const,
          createdAt:
            "2026-08-14T20:00:00.000Z",
          updatedAt:
            "2026-08-14T20:00:00.000Z"
        },
        stateVersion: 4,
        idempotentReplay: false
      };

      executor.execute.mockResolvedValue(
        executorResult
      );

      const result = await service.add(
        {
          commandId: "command-1",
          stateVersion: 3
        },
        {
          name: "Administrator",
          role: "ADMINISTRATOR"
        },
        entry,
        "Manual correction"
      );

      expect(executor.execute)
        .toHaveBeenCalledWith({
          commandId: "command-1",
          commandType:
            "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
          expectedStateVersion: 3,
          requestFingerprint:
            JSON.stringify({
              commandType:
                "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
              actorName: "Administrator",
              actorRole: "ADMINISTRATOR",
              comment: "Manual correction",
              entry: {
                auctionSessionId:
                  "session-1",
                auctionSessionTeamId:
                  "session-team-1",
                playerId: "player-1",
                acquisitionCost: 25,
                contractYear: 2
              }
            }),
          actorName: "Administrator",
          actorRole: "ADMINISTRATOR",
          comment: "Manual correction",
          entry
        });

      expect(result).toEqual(
        executorResult
      );
    });

    it("normalizes an omitted comment to null in both fingerprint and executor input", async () => {
      const {
        executor,
        service
      } = createFixture();

      executor.execute.mockResolvedValue({
        rosterEntry: {
          id: "roster-entry-1",
          ...entry,
          source: "INITIAL_ROSTER",
          createdAt:
            "2026-08-14T20:00:00.000Z",
          updatedAt:
            "2026-08-14T20:00:00.000Z"
        },
        stateVersion: 4,
        idempotentReplay: false
      });

      await service.add(
        {
          commandId: "command-2",
          stateVersion: 3
        },
        {
          name: "Auctioneer",
          role: "AUCTIONEER"
        },
        entry
      );

      expect(executor.execute)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            comment: null,
            requestFingerprint:
              JSON.stringify({
                commandType:
                  "ADD_MANUAL_INITIAL_ROSTER_ENTRY",
                actorName: "Auctioneer",
                actorRole: "AUCTIONEER",
                comment: null,
                entry: {
                  auctionSessionId:
                    "session-1",
                  auctionSessionTeamId:
                    "session-team-1",
                  playerId: "player-1",
                  acquisitionCost: 25,
                  contractYear: 2
                }
              })
          })
        );
    });
  }
);
