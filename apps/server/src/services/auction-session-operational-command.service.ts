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

export type ReopenAuctionSessionCommandInput = {
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

  async reopen(
    input: ReopenAuctionSessionCommandInput
  ): Promise<ExecuteAtomicAuctionSessionCommandResult> {
    return this.executor.execute({
      auctionSessionId:
        input.auctionSessionId,
      commandId:
        input.commandId,
      commandType:
        "REOPEN_SESSION",
      expectedStateVersion:
        input.expectedStateVersion,
      requestFingerprint:
        "REOPEN_SESSION",
      update: {
        status: "COMPLETED",
        suspensionReason: null
      },
      auditEvent: {
        auctionSessionId:
          input.auctionSessionId,
        eventType:
          "SESSION_REOPENED"
      },
      validate: (session) => {
        transitionAuctionSessionStatus(
          session.status,
          "reopen"
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
