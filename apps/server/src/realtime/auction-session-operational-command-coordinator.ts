import type {
  RealtimeAuctionSessionEventType
} from "@fantaastaapp/contracts";

import type {
  AuctionSessionOperationalCommandService,
  ResumeAuctionSessionCommandInput,
  SuspendAuctionSessionCommandInput
} from "../services/auction-session-operational-command.service.js";
import type {
  ExecuteAtomicAuctionSessionCommandResult
} from "./atomic-auction-session-command.executor.js";
import type {
  AuctionSessionRealtimeDispatcher
} from "./auction-session-realtime-dispatcher.js";
import type {
  AuctionSnapshotDispatcher
} from "./auction-snapshot-dispatcher.js";

type OperationalCommandService = Pick<
  AuctionSessionOperationalCommandService,
  "suspend" | "resume"
>;

type SessionRealtimeDispatcher = Pick<
  AuctionSessionRealtimeDispatcher,
  "dispatch"
>;

type SessionSnapshotDispatcher = Pick<
  AuctionSnapshotDispatcher,
  "dispatch"
>;

export type AuctionSessionOperationalDispatchFailure = {
  stage: "EVENT" | "SNAPSHOT";
  type: RealtimeAuctionSessionEventType;
  auctionSessionId: string;
  error: unknown;
};

export type AuctionSessionOperationalDispatchFailureHandler =
  (
    failure:
      AuctionSessionOperationalDispatchFailure
  ) => void;

export class AuctionSessionOperationalCommandCoordinator {
  constructor(
    private readonly service:
      OperationalCommandService,
    private readonly dispatcher:
      SessionRealtimeDispatcher,
    private readonly snapshotDispatcher:
      SessionSnapshotDispatcher,
    private readonly onDispatchFailure:
      AuctionSessionOperationalDispatchFailureHandler =
        () => {}
  ) {}

  async suspend(
    input: SuspendAuctionSessionCommandInput
  ): Promise<ExecuteAtomicAuctionSessionCommandResult> {
    const result =
      await this.service.suspend(input);

    if (result.idempotentReplay) {
      return result;
    }

    await this.dispatchPostCommit(
      "SESSION_SUSPENDED",
      input.auctionSessionId,
      {
        suspensionReason:
          input.reason
      }
    );

    return result;
  }

  async resume(
    input: ResumeAuctionSessionCommandInput
  ): Promise<ExecuteAtomicAuctionSessionCommandResult> {
    const result =
      await this.service.resume(input);

    if (result.idempotentReplay) {
      return result;
    }

    await this.dispatchPostCommit(
      "SESSION_RESUMED",
      input.auctionSessionId
    );

    return result;
  }

  private async dispatchPostCommit(
    type: RealtimeAuctionSessionEventType,
    auctionSessionId: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.dispatcher.dispatch({
        type,
        auctionSessionId,
        ...(
          payload === undefined
            ? {}
            : { payload }
        )
      });
    } catch (error) {
      this.onDispatchFailure({
        stage: "EVENT",
        type,
        auctionSessionId,
        error
      });
    }

    try {
      await this.snapshotDispatcher.dispatch(
        auctionSessionId
      );
    } catch (error) {
      this.onDispatchFailure({
        stage: "SNAPSHOT",
        type,
        auctionSessionId,
        error
      });
    }
  }
}
