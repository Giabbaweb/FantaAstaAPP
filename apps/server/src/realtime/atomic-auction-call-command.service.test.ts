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
  AtomicAuctionCallCommandService
} from "./atomic-auction-call-command.service.js";

describe("AtomicAuctionCallCommandService", () => {
  const aggregate = {
    call: {
      id: "auction-call-1",
      auctionSessionId: "session-1"
    }
  } as AuctionCallAggregate;

  function createFixture() {
    const executor = {
      execute: vi.fn()
    };

    const commandHandler = {
      open: vi.fn(),
      placeBid: vi.fn(),
      passTurn: vi.fn(),
      undoPass: vi.fn(),
      confirmAuctionCall: vi.fn(),
      cancelAuctionCall: vi.fn()
    };

    const confirmedAuctionAwardService = {
      apply: vi.fn()
    };

    const service =
      new AtomicAuctionCallCommandService(
        executor,
        commandHandler,
        confirmedAuctionAwardService
      );

    return {
      executor,
      commandHandler,
      confirmedAuctionAwardService,
      service
    };
  }

  it("maps open metadata and applies the handler", async () => {
    const {
      executor,
      commandHandler,
      service
    } = createFixture();

    const updatedAggregate = {
      ...aggregate
    };

    commandHandler.open.mockReturnValue(
      updatedAggregate
    );

    executor.execute.mockImplementation(
      async (input) => ({
        aggregate:
          input.apply(aggregate),
        stateVersion: 4,
        idempotentReplay: false
      })
    );

    const result = await service.open(
      "auction-call-1",
      {
        commandId: "command-1",
        stateVersion: 3
      },
      5
    );

    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        auctionCallId: "auction-call-1",
        commandId: "command-1",
        commandType: "OPEN",
        expectedStateVersion: 3,
        requestFingerprint:
          JSON.stringify({
            commandType: "OPEN",
            openingBid: 5
          })
      })
    );

    expect(commandHandler.open)
      .toHaveBeenCalledWith(
        aggregate,
        5
      );

    expect(result).toEqual({
      aggregate: updatedAggregate,
      stateVersion: 4,
      idempotentReplay: false
    });
  });

  it("applies the confirmed award inside the command transaction", async () => {
    const {
      executor,
      commandHandler,
      confirmedAuctionAwardService,
      service
    } = createFixture();

    const confirmedAggregate = {
      ...aggregate
    } as AuctionCallAggregate;

    const transactionExecutor = {
      transaction: "executor"
    };

    commandHandler.confirmAuctionCall
      .mockReturnValue(
        confirmedAggregate
      );

    executor.execute.mockImplementation(
      async (input) => ({
        aggregate: input.apply(
          aggregate,
          transactionExecutor
        ),
        stateVersion: 2,
        idempotentReplay: false
      })
    );

    const result =
      await service.confirmAuctionCall(
        "auction-call-1",
        {
          commandId: "command-confirm",
          stateVersion: 1
        }
      );

    expect(
      commandHandler.confirmAuctionCall
    ).toHaveBeenCalledWith(
      aggregate
    );

    expect(
      confirmedAuctionAwardService.apply
    ).toHaveBeenCalledWith(
      transactionExecutor,
      aggregate
    );

    expect(result).toEqual({
      aggregate: confirmedAggregate,
      stateVersion: 2,
      idempotentReplay: false
    });
  });

  it("maps the remaining auction commands", async () => {
    const {
      executor,
      service
    } = createFixture();

    executor.execute.mockResolvedValue({
      aggregate,
      stateVersion: 2,
      idempotentReplay: false
    });

    const metadata = {
      commandId: "command-2",
      stateVersion: 1
    };

    await service.placeBid(
      "auction-call-1",
      metadata,
      "session-team-1",
      10
    );

    await service.passTurn(
      "auction-call-1",
      metadata,
      "session-team-1"
    );

    await service.undoPass(
      "auction-call-1",
      metadata,
      "session-team-1"
    );

    await service.confirmAuctionCall(
      "auction-call-1",
      metadata
    );

    await service.cancelAuctionCall(
      "auction-call-1",
      metadata
    );

    expect(
      executor.execute.mock.calls.map(
        ([input]) => input.commandType
      )
    ).toEqual([
      "BID",
      "PASS",
      "UNDO_PASS",
      "CONFIRM",
      "CANCEL"
    ]);
  });
});
