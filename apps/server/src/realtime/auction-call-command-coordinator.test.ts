import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import {
  AuctionCallCommandCoordinator
} from "./auction-call-command-coordinator.js";

describe("AuctionCallCommandCoordinator", () => {
  const metadata = {
    commandId: "command-1",
    stateVersion: 3
  };

  const aggregate: AuctionCallAggregate = {
    call: {
      id: "auction-call-1",
      auctionSessionId: "session-1",
      playerId: "player-1",
      callerAuctionSessionTeamId:
        "auction-session-team-1",
      status: "OPEN",
      openingBid: 1,
      currentBid: 5,
      currentLeaderAuctionSessionTeamId:
        "auction-session-team-2",
      currentTurnAuctionSessionTeamId:
        "auction-session-team-3",
      provisionalWinnerAuctionSessionTeamId:
        null,
      createdAt:
        "2026-08-02T20:00:00.000Z",
      updatedAt:
        "2026-08-02T20:01:00.000Z"
    },
    teams: []
  };

  const commandResult = {
    aggregate,
    stateVersion: 4,
    idempotentReplay: false
  };

  function createFixture() {
    const service = {
      open:
        vi.fn().mockResolvedValue(commandResult),
      placeBid:
        vi.fn().mockResolvedValue(commandResult),
      passTurn:
        vi.fn().mockResolvedValue(commandResult),
      undoPass:
        vi.fn().mockResolvedValue(commandResult),
      confirmAuctionCall:
        vi.fn().mockResolvedValue(commandResult),
      cancelAuctionCall:
        vi.fn().mockResolvedValue(commandResult)
    };

    const dispatcher = {
      dispatch:
        vi.fn().mockResolvedValue(undefined)
    };

    const snapshotDispatcher = {
      dispatch:
        vi.fn().mockResolvedValue(undefined)
    };

    const backupRequester = {
      requestConfirmedAwardBackup:
        vi.fn().mockResolvedValue(undefined)
    };

    const onDispatchFailure = vi.fn();

    const coordinator =
      new AuctionCallCommandCoordinator(
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

  it("dispatches the opened event after an atomic command", async () => {
    const {
      service,
      dispatcher,
      snapshotDispatcher,
      coordinator
    } = createFixture();

    await expect(
      coordinator.open(
        "auction-call-1",
        metadata,
        1
      )
    ).resolves.toEqual(commandResult);

    expect(service.open).toHaveBeenCalledWith(
      "auction-call-1",
      metadata,
      1
    );

    expect(dispatcher.dispatch).toHaveBeenCalledWith({
      type: "AUCTION_CALL_OPENED",
      aggregate,
      payload: {
        openingBid: 1
      }
    });

    expect(
      snapshotDispatcher.dispatch
    ).toHaveBeenCalledWith("session-1");
  });

  it("maps bid, pass and undo pass events", async () => {
    const {
      dispatcher,
      coordinator
    } = createFixture();

    await coordinator.placeBid(
      "auction-call-1",
      metadata,
      "auction-session-team-2",
      5
    );

    await coordinator.passTurn(
      "auction-call-1",
      metadata,
      "auction-session-team-3"
    );

    await coordinator.undoPass(
      "auction-call-1",
      metadata,
      "auction-session-team-3"
    );

    expect(
      dispatcher.dispatch.mock.calls
    ).toEqual([
      [
        {
          type: "BID_PLACED",
          aggregate,
          payload: {
            auctionSessionTeamId:
              "auction-session-team-2",
            bid: 5
          }
        }
      ],
      [
        {
          type: "TEAM_PASSED",
          aggregate,
          payload: {
            auctionSessionTeamId:
              "auction-session-team-3"
          }
        }
      ],
      [
        {
          type: "TEAM_PASS_UNDONE",
          aggregate,
          payload: {
            auctionSessionTeamId:
              "auction-session-team-3"
          }
        }
      ]
    ]);
  });

  it("maps confirmation and cancellation events", async () => {
    const {
      dispatcher,
      coordinator
    } = createFixture();

    await coordinator.confirmAuctionCall(
      "auction-call-1",
      metadata
    );

    await coordinator.cancelAuctionCall(
      "auction-call-1",
      metadata
    );

    expect(
      dispatcher.dispatch.mock.calls
    ).toEqual([
      [
        {
          type: "AUCTION_CALL_CONFIRMED",
          aggregate
        }
      ],
      [
        {
          type: "AUCTION_CALL_CANCELLED",
          aggregate
        }
      ]
    ]);
  });

  it("does not dispatch when the command fails", async () => {
    const {
      service,
      dispatcher,
      snapshotDispatcher,
      coordinator
    } = createFixture();

    service.placeBid.mockRejectedValueOnce(
      new Error("Command failed")
    );

    await expect(
      coordinator.placeBid(
        "auction-call-1",
        metadata,
        "auction-session-team-2",
        5
      )
    ).rejects.toThrow("Command failed");

    expect(
      dispatcher.dispatch
    ).not.toHaveBeenCalled();

    expect(
      snapshotDispatcher.dispatch
    ).not.toHaveBeenCalled();
  });

  it("does not republish an idempotent replay", async () => {
    const {
      service,
      dispatcher,
      snapshotDispatcher,
      coordinator
    } = createFixture();

    service.open.mockResolvedValueOnce({
      ...commandResult,
      idempotentReplay: true
    });

    await expect(
      coordinator.open(
        "auction-call-1",
        metadata,
        1
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
  });

  it("returns persisted state when event dispatch fails", async () => {
    const {
      dispatcher,
      onDispatchFailure,
      coordinator
    } = createFixture();

    const publicationError =
      new Error("Publication failed");

    dispatcher.dispatch.mockRejectedValueOnce(
      publicationError
    );

    await expect(
      coordinator.open(
        "auction-call-1",
        metadata,
        1
      )
    ).resolves.toEqual(commandResult);

    expect(
      onDispatchFailure
    ).toHaveBeenCalledWith({
      stage: "EVENT",
      type: "AUCTION_CALL_OPENED",
      aggregate,
      error: publicationError
    });
  });

  it("attempts the snapshot when event dispatch fails", async () => {
    const {
      dispatcher,
      snapshotDispatcher,
      coordinator
    } = createFixture();

    dispatcher.dispatch.mockRejectedValueOnce(
      new Error("Event failed")
    );

    await coordinator.open(
      "auction-call-1",
      metadata,
      1
    );

    expect(
      snapshotDispatcher.dispatch
    ).toHaveBeenCalledWith("session-1");
  });

  it("reports snapshot failures without failing the command", async () => {
    const {
      snapshotDispatcher,
      onDispatchFailure,
      coordinator
    } = createFixture();

    const snapshotError =
      new Error("Snapshot failed");

    snapshotDispatcher.dispatch
      .mockRejectedValueOnce(
        snapshotError
      );

    await expect(
      coordinator.open(
        "auction-call-1",
        metadata,
        1
      )
    ).resolves.toEqual(commandResult);

    expect(
      onDispatchFailure
    ).toHaveBeenCalledWith({
      stage: "SNAPSHOT",
      type: "AUCTION_CALL_OPENED",
      aggregate,
      error: snapshotError
    });
  });

  it("requests a backup after a confirmed auction call", async () => {
    const {
      backupRequester,
      coordinator
    } = createFixture();

    await coordinator.confirmAuctionCall(
      "auction-call-1",
      metadata
    );

    expect(
      backupRequester.requestConfirmedAwardBackup
    ).toHaveBeenCalledTimes(1);

    expect(
      backupRequester.requestConfirmedAwardBackup
    ).toHaveBeenCalledWith({
      auctionSessionId: "session-1",
      auctionCallId: "auction-call-1",
      aggregate
    });
  });

  it("does not request a backup for an idempotent confirm replay", async () => {
    const {
      service,
      backupRequester,
      coordinator
    } = createFixture();

    service.confirmAuctionCall
      .mockResolvedValueOnce({
        ...commandResult,
        idempotentReplay: true
      });

    await expect(
      coordinator.confirmAuctionCall(
        "auction-call-1",
        metadata
      )
    ).resolves.toMatchObject({
      idempotentReplay: true
    });

    expect(
      backupRequester.requestConfirmedAwardBackup
    ).not.toHaveBeenCalled();
  });

  it("reports backup failures without failing the confirmed command", async () => {
    const {
      backupRequester,
      onDispatchFailure,
      coordinator
    } = createFixture();

    const backupError =
      new Error("Backup failed");

    backupRequester
      .requestConfirmedAwardBackup
      .mockRejectedValueOnce(
        backupError
      );

    await expect(
      coordinator.confirmAuctionCall(
        "auction-call-1",
        metadata
      )
    ).resolves.toEqual(commandResult);

    expect(
      onDispatchFailure
    ).toHaveBeenCalledWith({
      stage: "BACKUP",
      type: "AUCTION_CALL_CONFIRMED",
      aggregate,
      error: backupError
    });
  });

});
