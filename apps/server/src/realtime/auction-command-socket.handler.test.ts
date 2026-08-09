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
  AtomicAuctionCommandExecutorError
} from "./atomic-auction-command.executor.js";
import {
  AuctionCommandSocketHandler
} from "./auction-command-socket.handler.js";
import {
  RealtimeConnectionManager
} from "./realtime-connection-manager.js";

describe("AuctionCommandSocketHandler", () => {
  const aggregate = {
    call: {
      id: "auction-call-1",
      auctionSessionId: "session-1"
    }
  } as AuctionCallAggregate;

  const metadata = {
    commandId: "command-1",
    stateVersion: 3
  };

  function createFixture(
    role: "OPERATOR" | "OBSERVER" =
      "OPERATOR"
  ) {
    const connectionManager =
      new RealtimeConnectionManager();

    connectionManager.connect({
      socketId: "socket-1"
    });

    connectionManager.register(
      "socket-1",
      {
        kind: "TEAM",
        deviceId: "device-1",
        auctionSessionId: "session-1",
        auctionSessionTeamId:
          "session-team-1",
        role
      }
    );

    const auctionCallReader = {
      getById:
        vi.fn().mockResolvedValue(
          aggregate
        )
    };

    const commandResult = {
      aggregate,
      stateVersion: 4,
      idempotentReplay: false
    };

    const coordinator = {
      placeBid:
        vi.fn().mockResolvedValue(
          commandResult
        ),
      passTurn:
        vi.fn().mockResolvedValue(
          commandResult
        ),
      undoPass:
        vi.fn().mockResolvedValue(
          commandResult
        )
    };

    const handler =
      new AuctionCommandSocketHandler(
        connectionManager,
        auctionCallReader,
        coordinator
      );

    return {
      connectionManager,
      auctionCallReader,
      coordinator,
      handler
    };
  }

  it("executes a bid for the registered operator team", async () => {
    const {
      coordinator,
      handler
    } = createFixture();

    await expect(
      handler.handle(
        "socket-1",
        {
          auctionCallId:
            "auction-call-1",
          command: "BID",
          metadata,
          auctionSessionTeamId:
            "session-team-1",
          bid: 5
        }
      )
    ).resolves.toEqual({
      success: true,
      data: {
        stateVersion: 4,
        idempotentReplay: false
      },
      error: null
    });

    expect(
      coordinator.placeBid
    ).toHaveBeenCalledWith(
      "auction-call-1",
      metadata,
      "session-team-1",
      5
    );
  });

  it("executes pass and undo pass", async () => {
    const {
      coordinator,
      handler
    } = createFixture();

    await handler.handle(
      "socket-1",
      {
        auctionCallId:
          "auction-call-1",
        command: "PASS",
        metadata,
        auctionSessionTeamId:
          "session-team-1"
      }
    );

    await handler.handle(
      "socket-1",
      {
        auctionCallId:
          "auction-call-1",
        command: "UNDO_PASS",
        metadata,
        auctionSessionTeamId:
          "session-team-1"
      }
    );

    expect(
      coordinator.passTurn
    ).toHaveBeenCalledTimes(1);

    expect(
      coordinator.undoPass
    ).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid payload", async () => {
    const { handler } = createFixture();

    await expect(
      handler.handle(
        "socket-1",
        {
          command: "BID"
        }
      )
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR"
      }
    });
  });

  it("rejects an unregistered socket", async () => {
    const {
      connectionManager,
      auctionCallReader,
      coordinator
    } = createFixture();

    connectionManager.connect({
      socketId: "socket-2"
    });

    const handler =
      new AuctionCommandSocketHandler(
        connectionManager,
        auctionCallReader,
        coordinator
      );

    await expect(
      handler.handle(
        "socket-2",
        {
          auctionCallId:
            "auction-call-1",
          command: "PASS",
          metadata,
          auctionSessionTeamId:
            "session-team-1"
        }
      )
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED"
      }
    });
  });

  it("rejects observers", async () => {
    const { handler } =
      createFixture("OBSERVER");

    await expect(
      handler.handle(
        "socket-1",
        {
          auctionCallId:
            "auction-call-1",
          command: "PASS",
          metadata,
          auctionSessionTeamId:
            "session-team-1"
        }
      )
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED"
      }
    });
  });

  it("rejects public display connections", async () => {
    const connectionManager =
      new RealtimeConnectionManager();

    connectionManager.connect({
      socketId: "public-display-socket"
    });

    connectionManager.register(
      "public-display-socket",
      {
        kind: "PUBLIC_DISPLAY",
        deviceId: "public-display-1",
        auctionSessionId: "session-1"
      }
    );

    const auctionCallReader = {
      getById:
        vi.fn().mockResolvedValue(
          aggregate
        )
    };

    const coordinator = {
      placeBid: vi.fn(),
      passTurn: vi.fn(),
      undoPass: vi.fn()
    };

    const handler =
      new AuctionCommandSocketHandler(
        connectionManager,
        auctionCallReader,
        coordinator
      );

    await expect(
      handler.handle(
        "public-display-socket",
        {
          auctionCallId:
            "auction-call-1",
          command: "PASS",
          metadata,
          auctionSessionTeamId:
            "session-team-1"
        }
      )
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED"
      }
    });

    expect(
      auctionCallReader.getById
    ).not.toHaveBeenCalled();

    expect(
      coordinator.passTurn
    ).not.toHaveBeenCalled();
  });

  it("rejects commands for another team", async () => {
    const {
      coordinator,
      handler
    } = createFixture();

    await expect(
      handler.handle(
        "socket-1",
        {
          auctionCallId:
            "auction-call-1",
          command: "PASS",
          metadata,
          auctionSessionTeamId:
            "session-team-2"
        }
      )
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED"
      }
    });

    expect(
      coordinator.passTurn
    ).not.toHaveBeenCalled();
  });

  it("rejects calls from another session", async () => {
    const {
      auctionCallReader,
      coordinator,
      handler
    } = createFixture();

    auctionCallReader.getById
      .mockResolvedValueOnce({
        ...aggregate,
        call: {
          ...aggregate.call,
          auctionSessionId:
            "session-2"
        }
      });

    await expect(
      handler.handle(
        "socket-1",
        {
          auctionCallId:
            "auction-call-1",
          command: "PASS",
          metadata,
          auctionSessionTeamId:
            "session-team-1"
        }
      )
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "UNAUTHORIZED"
      }
    });

    expect(
      coordinator.passTurn
    ).not.toHaveBeenCalled();
  });

  it("rejects banditore-only commands", async () => {
    const { handler } = createFixture();

    await expect(
      handler.handle(
        "socket-1",
        {
          auctionCallId:
            "auction-call-1",
          command: "CONFIRM",
          metadata
        }
      )
    ).resolves.toMatchObject({
      success: false,
      error: {
        code: "COMMAND_NOT_ALLOWED"
      }
    });
  });

  it("maps atomic command errors", async () => {
    const {
      coordinator,
      handler
    } = createFixture();

    coordinator.passTurn
      .mockRejectedValueOnce(
        new AtomicAuctionCommandExecutorError(
          "STALE_STATE",
          "State is stale"
        )
      );

    await expect(
      handler.handle(
        "socket-1",
        {
          auctionCallId:
            "auction-call-1",
          command: "PASS",
          metadata,
          auctionSessionTeamId:
            "session-team-1"
        }
      )
    ).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: "STALE_STATE",
        message: "State is stale"
      }
    });
  });
});
