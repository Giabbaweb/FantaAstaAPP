import type {
  RealtimeCommandMetadata
} from "@fantaastaapp/contracts";

import type {
  AuctionCallCommandHandler
} from "../services/auction-call-command-handler.js";
import type {
  AtomicAuctionCommandExecutor,
  ExecuteAtomicAuctionCommandResult
} from "./atomic-auction-command.executor.js";

type AtomicAuctionCommandExecutorPort = Pick<
  AtomicAuctionCommandExecutor,
  "execute"
>;

type AuctionCallCommandHandlerPort = Pick<
  AuctionCallCommandHandler,
  | "open"
  | "placeBid"
  | "passTurn"
  | "undoPass"
  | "confirmAuctionCall"
  | "cancelAuctionCall"
>;

export class AtomicAuctionCallCommandService {
  constructor(
    private readonly executor:
      AtomicAuctionCommandExecutorPort,
    private readonly commandHandler:
      AuctionCallCommandHandlerPort
  ) {}

  async open(
    auctionCallId: string,
    metadata: RealtimeCommandMetadata,
    openingBid: number
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    return this.executor.execute({
      auctionCallId,
      commandId: metadata.commandId,
      commandType: "OPEN",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType: "OPEN",
          openingBid
        }),
      apply: (aggregate) =>
        this.commandHandler.open(
          aggregate,
          openingBid
        )
    });
  }

  async placeBid(
    auctionCallId: string,
    metadata: RealtimeCommandMetadata,
    auctionSessionTeamId: string,
    bid: number
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    return this.executor.execute({
      auctionCallId,
      commandId: metadata.commandId,
      commandType: "BID",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType: "BID",
          auctionSessionTeamId,
          bid
        }),
      apply: (aggregate) =>
        this.commandHandler.placeBid(
          aggregate,
          auctionSessionTeamId,
          bid
        )
    });
  }

  async passTurn(
    auctionCallId: string,
    metadata: RealtimeCommandMetadata,
    auctionSessionTeamId: string
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    return this.executor.execute({
      auctionCallId,
      commandId: metadata.commandId,
      commandType: "PASS",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType: "PASS",
          auctionSessionTeamId
        }),
      apply: (aggregate) =>
        this.commandHandler.passTurn(
          aggregate,
          auctionSessionTeamId
        )
    });
  }

  async undoPass(
    auctionCallId: string,
    metadata: RealtimeCommandMetadata,
    auctionSessionTeamId: string
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    return this.executor.execute({
      auctionCallId,
      commandId: metadata.commandId,
      commandType: "UNDO_PASS",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType: "UNDO_PASS",
          auctionSessionTeamId
        }),
      apply: (aggregate) =>
        this.commandHandler.undoPass(
          aggregate,
          auctionSessionTeamId
        )
    });
  }

  async confirmAuctionCall(
    auctionCallId: string,
    metadata: RealtimeCommandMetadata
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    return this.executor.execute({
      auctionCallId,
      commandId: metadata.commandId,
      commandType: "CONFIRM",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType: "CONFIRM"
        }),
      apply: (aggregate) =>
        this.commandHandler
          .confirmAuctionCall(aggregate)
    });
  }

  async cancelAuctionCall(
    auctionCallId: string,
    metadata: RealtimeCommandMetadata
  ): Promise<ExecuteAtomicAuctionCommandResult> {
    return this.executor.execute({
      auctionCallId,
      commandId: metadata.commandId,
      commandType: "CANCEL",
      expectedStateVersion:
        metadata.stateVersion,
      requestFingerprint:
        JSON.stringify({
          commandType: "CANCEL"
        }),
      apply: (aggregate) =>
        this.commandHandler
          .cancelAuctionCall(aggregate)
    });
  }
}
