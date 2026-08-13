import type {
  AuctionSessionSuspensionReason
} from "@fantaastaapp/contracts";
import {
  transitionAuctionSessionStatus
} from "@fantaastaapp/domain";

import {
  AtomicAuctionSessionCommandExecutor
} from "../realtime/atomic-auction-session-command.executor.js";
import type {
  ExecuteAtomicAuctionSessionCommandResult
} from "../realtime/atomic-auction-session-command.executor.js";

export type SuspendAuctionSessionCommandInput = {
  auctionSessionId: string;
  commandId: string;
  expectedStateVersion: number;
  reason: AuctionSessionSuspensionReason;
};

export type ResumeAuctionSessionCommandInput = {
  auctionSessionId: string;
  commandId: string;
  expectedStateVersion: number;
};

export class AuctionSessionOperationalCommandService {
  constructor(
    private readonly executor:
      AtomicAuctionSessionCommandExecutor
  ) {}

  async suspend(
    input: SuspendAuctionSessionCommandInput
  ): Promise<ExecuteAtomicAuctionSessionCommandResult> {
    return this.executor.execute({
      auctionSessionId:
        input.auctionSessionId,
      commandId:
        input.commandId,
      commandType:
        "SUSPEND_SESSION",
      expectedStateVersion:
        input.expectedStateVersion,
      requestFingerprint:
        this.createSuspendFingerprint(
          input.reason
        ),
      update: {
        status: "SUSPENDED",
        suspensionReason:
          input.reason
      },
      auditEvent: {
        auctionSessionId:
          input.auctionSessionId,
        eventType:
          "SESSION_SUSPENDED",
        suspensionReason:
          input.reason
      },
      validate: (session) => {
        transitionAuctionSessionStatus(
          session.status,
          "suspend"
        );
      }
    });
  }

  async resume(
    input: ResumeAuctionSessionCommandInput
  ): Promise<ExecuteAtomicAuctionSessionCommandResult> {
    return this.executor.execute({
      auctionSessionId:
        input.auctionSessionId,
      commandId:
        input.commandId,
      commandType:
        "RESUME_SESSION",
      expectedStateVersion:
        input.expectedStateVersion,
      requestFingerprint:
        "RESUME_SESSION",
      update: {
        status: "RUNNING",
        suspensionReason: null
      },
      auditEvent: {
        auctionSessionId:
          input.auctionSessionId,
        eventType:
          "SESSION_RESUMED"
      },
      validate: (session) => {
        transitionAuctionSessionStatus(
          session.status,
          "resume"
        );
      }
    });
  }

  private createSuspendFingerprint(
    reason: AuctionSessionSuspensionReason
  ): string {
    return `SUSPEND_SESSION:${reason}`;
  }
}
