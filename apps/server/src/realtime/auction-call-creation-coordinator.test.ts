import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AuctionCallCreationCoordinator
} from "./auction-call-creation-coordinator.js";

describe(
  "AuctionCallCreationCoordinator",
  () => {
    const aggregate = {
      call: {
        id: "call-1",
        auctionSessionId: "session-1",
        playerId: "player-1",
        callerAuctionSessionTeamId:
          "session-team-1",
        status: "DRAFT",
        openingBid: null,
        currentBid: null,
        leaderAuctionSessionTeamId: null,
        provisionalWinnerAuctionSessionTeamId:
          null,
        provisionalPrice: null,
        createdAt:
          "2026-08-25T12:00:00.000Z",
        updatedAt:
          "2026-08-25T12:00:00.000Z"
      },
      teams: []
    };

    function createFixture(
      idempotentReplay = false
    ) {
      const result = {
        aggregate,
        stateVersion: 4,
        idempotentReplay
      };

      const service = {
        createDraft:
          vi.fn().mockResolvedValue(result)
      };

      const snapshotDispatcher = {
        dispatch:
          vi.fn().mockResolvedValue(undefined)
      };

      const onDispatchFailure = vi.fn();

      const coordinator =
        new AuctionCallCreationCoordinator(
          service,
          snapshotDispatcher,
          onDispatchFailure
        );

      return {
        result,
        service,
        snapshotDispatcher,
        onDispatchFailure,
        coordinator
      };
    }

    it(
      "publishes the authoritative snapshot after creation",
      async () => {
        const {
          result,
          service,
          snapshotDispatcher,
          coordinator
        } = createFixture();

        const input = {
          auctionSessionId: "session-1",
          auctionCallId: "call-1",
          playerFmsCode: "100002",
          commandId: "command-1",
          expectedStateVersion: 3
        };

        await expect(
          coordinator.createDraft(input)
        ).resolves.toEqual(result);

        expect(
          service.createDraft
        ).toHaveBeenCalledWith(input);

        expect(
          snapshotDispatcher.dispatch
        ).toHaveBeenCalledOnce();

        expect(
          snapshotDispatcher.dispatch
        ).toHaveBeenCalledWith(
          "session-1"
        );
      }
    );

    it(
      "does not publish again for an idempotent replay",
      async () => {
        const {
          snapshotDispatcher,
          coordinator
        } = createFixture(true);

        await coordinator.createDraft({
          auctionSessionId: "session-1",
          auctionCallId: "call-1",
          playerFmsCode: "100002",
          commandId: "command-1",
          expectedStateVersion: 3
        });

        expect(
          snapshotDispatcher.dispatch
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not fail creation when snapshot publication fails",
      async () => {
        const {
          result,
          snapshotDispatcher,
          onDispatchFailure,
          coordinator
        } = createFixture();

        snapshotDispatcher.dispatch
          .mockRejectedValueOnce(
            new Error("snapshot failed")
          );

        await expect(
          coordinator.createDraft({
            auctionSessionId: "session-1",
            auctionCallId: "call-1",
            playerFmsCode: "100002",
            commandId: "command-1",
            expectedStateVersion: 3
          })
        ).resolves.toEqual(result);

        expect(
          onDispatchFailure
        ).toHaveBeenCalledWith({
          stage: "SNAPSHOT",
          auctionSessionId: "session-1",
          error: expect.any(Error)
        });
      }
    );
  }
);
