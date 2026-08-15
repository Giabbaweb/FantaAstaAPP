import {
  randomUUID
} from "node:crypto";

import {
  asc,
  eq
} from "drizzle-orm";

import {
  db
} from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import {
  auctionEvents
} from "../db/schema/index.js";

export type AuctionEventType =
  | "AUCTION_AWARD_CONFIRMED"
  | "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY"
  | "MANUAL_ROSTER_ASSIGNMENT_ADDED"
  | "TECHNICAL_ROSTER_CORRECTION"
  | "SESSION_SUSPENDED"
  | "SESSION_RESUMED"
  | "SESSION_REOPENED";

export type AuctionAwardConfirmedEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: string;
  eventType: "AUCTION_AWARD_CONFIRMED";
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
  contractYear: null;
  actorName: null;
  actorRole: null;
  comment: null;
  manualAssignmentReason: null;
  suspensionReason: null;
  createdAt: string;
};

export type ManualInitialRosterEntryAddedEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: null;
  eventType:
    "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY";
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
  contractYear: 1 | 2 | 3;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment: string | null;
  manualAssignmentReason: null;
  suspensionReason: null;
  createdAt: string;
};

export type ManualRosterAssignmentAddedEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: null;
  eventType:
    "MANUAL_ROSTER_ASSIGNMENT_ADDED";
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
  contractYear: 1 | 2 | 3;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment: string | null;
  manualAssignmentReason:
    | "OPTION_EXERCISED_MANUALLY"
    | "OPTION_NO_EXTERNAL_BID"
    | "TECHNICAL_CORRECTION"
    | "OTHER";
  suspensionReason: null;
  createdAt: string;
};

export type TechnicalRosterCorrectionEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: null;
  eventType:
    "TECHNICAL_ROSTER_CORRECTION";
  auctionSessionTeamId: null;
  playerId: null;
  amount: null;
  creditsBefore: null;
  creditsAfter: null;
  contractYear: null;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment: string;
  manualAssignmentReason: null;
  beforeAuctionSessionTeamId: string;
  beforePlayerId: string;
  beforeAmount: number;
  beforeContractYear: 1 | 2 | 3;
  afterAuctionSessionTeamId: string;
  afterPlayerId: string;
  afterAmount: number;
  afterContractYear: 1 | 2 | 3;
  suspensionReason: null;
  createdAt: string;
};

export type AuctionSessionSuspendedEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: null;
  eventType: "SESSION_SUSPENDED";
  auctionSessionTeamId: null;
  playerId: null;
  amount: null;
  creditsBefore: null;
  creditsAfter: null;
  contractYear: null;
  actorName: null;
  actorRole: null;
  comment: null;
  manualAssignmentReason: null;
  suspensionReason:
    | "PIZZA_BREAK"
    | "TECHNICAL_BREAK"
    | "ORGANIZATIONAL_BREAK"
    | "NETWORK_ISSUE"
    | "OTHER";
  createdAt: string;
};

export type AuctionSessionResumedEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: null;
  eventType: "SESSION_RESUMED";
  auctionSessionTeamId: null;
  playerId: null;
  amount: null;
  creditsBefore: null;
  creditsAfter: null;
  contractYear: null;
  actorName: null;
  actorRole: null;
  comment: null;
  manualAssignmentReason: null;
  suspensionReason: null;
  createdAt: string;
};

export type AuctionSessionReopenedEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: null;
  eventType: "SESSION_REOPENED";
  auctionSessionTeamId: null;
  playerId: null;
  amount: null;
  creditsBefore: null;
  creditsAfter: null;
  contractYear: null;
  actorName: null;
  actorRole: null;
  comment: null;
  manualAssignmentReason: null;
  suspensionReason: null;
  createdAt: string;
};

export type AuctionEvent =
  | AuctionAwardConfirmedEvent
  | ManualInitialRosterEntryAddedEvent
  | ManualRosterAssignmentAddedEvent
  | TechnicalRosterCorrectionEvent
  | AuctionSessionSuspendedEvent
  | AuctionSessionResumedEvent
  | AuctionSessionReopenedEvent;

export type CreateAuctionAwardConfirmedEventInput = {
  auctionSessionId: string;
  auctionCallId: string;
  eventType: "AUCTION_AWARD_CONFIRMED";
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
};

export type CreateManualInitialRosterEntryAddedEventInput = {
  auctionSessionId: string;
  eventType:
    "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY";
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
  contractYear: 1 | 2 | 3;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment?: string | null;
};

export type CreateManualRosterAssignmentAddedEventInput = {
  auctionSessionId: string;
  eventType:
    "MANUAL_ROSTER_ASSIGNMENT_ADDED";
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
  contractYear: 1 | 2 | 3;
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment?: string | null;
  manualAssignmentReason:
    ManualRosterAssignmentAddedEvent[
      "manualAssignmentReason"
    ];
};

export type CreateTechnicalRosterCorrectionEventInput = {
  auctionSessionId: string;
  eventType:
    "TECHNICAL_ROSTER_CORRECTION";
  actorName: string;
  actorRole:
    | "ADMINISTRATOR"
    | "AUCTIONEER";
  comment: string;
  beforeAuctionSessionTeamId: string;
  beforePlayerId: string;
  beforeAmount: number;
  beforeContractYear: 1 | 2 | 3;
  afterAuctionSessionTeamId: string;
  afterPlayerId: string;
  afterAmount: number;
  afterContractYear: 1 | 2 | 3;
};

export type CreateAuctionSessionSuspendedEventInput = {
  auctionSessionId: string;
  eventType: "SESSION_SUSPENDED";
  suspensionReason:
    AuctionSessionSuspendedEvent["suspensionReason"];
};

export type CreateAuctionSessionResumedEventInput = {
  auctionSessionId: string;
  eventType: "SESSION_RESUMED";
};

export type CreateAuctionSessionReopenedEventInput = {
  auctionSessionId: string;
  eventType: "SESSION_REOPENED";
};

export type CreateAuctionEventInput =
  | CreateAuctionAwardConfirmedEventInput
  | CreateManualInitialRosterEntryAddedEventInput
  | CreateManualRosterAssignmentAddedEventInput
  | CreateTechnicalRosterCorrectionEventInput
  | CreateAuctionSessionSuspendedEventInput
  | CreateAuctionSessionResumedEventInput
  | CreateAuctionSessionReopenedEventInput;

type AuctionEventRecord =
  typeof auctionEvents.$inferSelect;

function mapAuctionEvent(
  record: AuctionEventRecord
): AuctionEvent {
  switch (record.eventType) {
    case "AUCTION_AWARD_CONFIRMED": {
      if (
        record.auctionCallId === null ||
        record.auctionSessionTeamId === null ||
        record.playerId === null ||
        record.amount === null ||
        record.creditsBefore === null ||
        record.creditsAfter === null ||
        record.contractYear !== null ||
        record.actorName !== null ||
        record.actorRole !== null ||
        record.comment !== null ||
        record.manualAssignmentReason !== null ||
        record.suspensionReason !== null
      ) {
        throw new Error(
          `Invalid AUCTION_AWARD_CONFIRMED event "${record.id}"`
        );
      }

      return {
        ...record,
        eventType:
          "AUCTION_AWARD_CONFIRMED",
        auctionCallId:
          record.auctionCallId,
        auctionSessionTeamId:
          record.auctionSessionTeamId,
        playerId:
          record.playerId,
        amount:
          record.amount,
        creditsBefore:
          record.creditsBefore,
        creditsAfter:
          record.creditsAfter,
        contractYear: null,
        actorName: null,
        actorRole: null,
        comment: null,
        manualAssignmentReason: null,
        suspensionReason: null
      };
    }

    case "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY": {
      if (
        record.auctionCallId !== null ||
        record.auctionSessionTeamId === null ||
        record.playerId === null ||
        record.amount === null ||
        record.creditsBefore === null ||
        record.creditsAfter === null ||
        record.contractYear === null ||
        (
          record.contractYear !== 1 &&
          record.contractYear !== 2 &&
          record.contractYear !== 3
        ) ||
        record.actorName === null ||
        record.actorName.length === 0 ||
        (
          record.actorRole !== "ADMINISTRATOR" &&
          record.actorRole !== "AUCTIONEER"
        ) ||
        record.manualAssignmentReason !== null ||
        record.suspensionReason !== null
      ) {
        throw new Error(
          `Invalid INITIAL_ROSTER_ENTRY_ADDED_MANUALLY event "${record.id}"`
        );
      }

      return {
        ...record,
        eventType:
          "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY",
        auctionCallId: null,
        auctionSessionTeamId:
          record.auctionSessionTeamId,
        playerId:
          record.playerId,
        amount:
          record.amount,
        creditsBefore:
          record.creditsBefore,
        creditsAfter:
          record.creditsAfter,
        contractYear:
          record.contractYear,
        actorName:
          record.actorName,
        actorRole:
          record.actorRole,
        comment:
          record.comment,
        manualAssignmentReason: null,
        suspensionReason: null
      };
    }

    case "MANUAL_ROSTER_ASSIGNMENT_ADDED": {
      if (
        record.auctionCallId !== null ||
        record.auctionSessionTeamId === null ||
        record.playerId === null ||
        record.amount === null ||
        record.creditsBefore === null ||
        record.creditsAfter === null ||
        record.contractYear === null ||
        (
          record.contractYear !== 1 &&
          record.contractYear !== 2 &&
          record.contractYear !== 3
        ) ||
        record.actorName === null ||
        record.actorName.length === 0 ||
        (
          record.actorRole !== "ADMINISTRATOR" &&
          record.actorRole !== "AUCTIONEER"
        ) ||
        record.manualAssignmentReason === null ||
        record.suspensionReason !== null
      ) {
        throw new Error(
          `Invalid MANUAL_ROSTER_ASSIGNMENT_ADDED event "${record.id}"`
        );
      }

      return {
        ...record,
        eventType:
          "MANUAL_ROSTER_ASSIGNMENT_ADDED",
        auctionCallId: null,
        auctionSessionTeamId:
          record.auctionSessionTeamId,
        playerId:
          record.playerId,
        amount:
          record.amount,
        creditsBefore:
          record.creditsBefore,
        creditsAfter:
          record.creditsAfter,
        contractYear:
          record.contractYear,
        actorName:
          record.actorName,
        actorRole:
          record.actorRole,
        comment:
          record.comment,
        manualAssignmentReason:
          record.manualAssignmentReason,
        suspensionReason: null
      };
    }

    case "TECHNICAL_ROSTER_CORRECTION": {
      if (
        record.auctionCallId !== null ||
        record.auctionSessionTeamId !== null ||
        record.playerId !== null ||
        record.amount !== null ||
        record.creditsBefore !== null ||
        record.creditsAfter !== null ||
        record.contractYear !== null ||
        record.actorName === null ||
        record.actorName.length === 0 ||
        (
          record.actorRole !== "ADMINISTRATOR" &&
          record.actorRole !== "AUCTIONEER"
        ) ||
        record.comment === null ||
        record.comment.trim().length === 0 ||
        record.manualAssignmentReason !== null ||
        record.beforeAuctionSessionTeamId === null ||
        record.beforePlayerId === null ||
        record.beforeAmount === null ||
        record.beforeAmount <= 0 ||
        record.beforeContractYear === null ||
        (
          record.beforeContractYear !== 1 &&
          record.beforeContractYear !== 2 &&
          record.beforeContractYear !== 3
        ) ||
        record.afterAuctionSessionTeamId === null ||
        record.afterPlayerId === null ||
        record.afterAmount === null ||
        record.afterAmount <= 0 ||
        record.afterContractYear === null ||
        (
          record.afterContractYear !== 1 &&
          record.afterContractYear !== 2 &&
          record.afterContractYear !== 3
        ) ||
        record.suspensionReason !== null
      ) {
        throw new Error(
          `Invalid TECHNICAL_ROSTER_CORRECTION event "${record.id}"`
        );
      }

      return {
        ...record,
        eventType:
          "TECHNICAL_ROSTER_CORRECTION",
        auctionCallId: null,
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        contractYear: null,
        actorName: record.actorName,
        actorRole: record.actorRole,
        comment: record.comment,
        manualAssignmentReason: null,
        beforeAuctionSessionTeamId:
          record.beforeAuctionSessionTeamId,
        beforePlayerId: record.beforePlayerId,
        beforeAmount: record.beforeAmount,
        beforeContractYear:
          record.beforeContractYear,
        afterAuctionSessionTeamId:
          record.afterAuctionSessionTeamId,
        afterPlayerId: record.afterPlayerId,
        afterAmount: record.afterAmount,
        afterContractYear:
          record.afterContractYear,
        suspensionReason: null
      };
    }

    case "SESSION_SUSPENDED": {
      if (
        record.auctionCallId !== null ||
        record.auctionSessionTeamId !== null ||
        record.playerId !== null ||
        record.amount !== null ||
        record.creditsBefore !== null ||
        record.creditsAfter !== null ||
        record.contractYear !== null ||
        record.actorName !== null ||
        record.actorRole !== null ||
        record.comment !== null ||
        record.manualAssignmentReason !== null ||
        record.suspensionReason === null
      ) {
        throw new Error(
          `Invalid SESSION_SUSPENDED event "${record.id}"`
        );
      }

      return {
        ...record,
        eventType:
          "SESSION_SUSPENDED",
        auctionCallId: null,
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        contractYear: null,
        actorName: null,
        actorRole: null,
        comment: null,
        manualAssignmentReason: null,
        suspensionReason:
          record.suspensionReason
      };
    }

    case "SESSION_RESUMED": {
      if (
        record.auctionCallId !== null ||
        record.auctionSessionTeamId !== null ||
        record.playerId !== null ||
        record.amount !== null ||
        record.creditsBefore !== null ||
        record.creditsAfter !== null ||
        record.contractYear !== null ||
        record.actorName !== null ||
        record.actorRole !== null ||
        record.comment !== null ||
        record.manualAssignmentReason !== null ||
        record.suspensionReason !== null
      ) {
        throw new Error(
          `Invalid SESSION_RESUMED event "${record.id}"`
        );
      }

      return {
        ...record,
        eventType:
          "SESSION_RESUMED",
        auctionCallId: null,
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        contractYear: null,
        actorName: null,
        actorRole: null,
        comment: null,
        manualAssignmentReason: null,
        suspensionReason: null
      };
    }

    case "SESSION_REOPENED": {
      if (
        record.auctionCallId !== null ||
        record.auctionSessionTeamId !== null ||
        record.playerId !== null ||
        record.amount !== null ||
        record.creditsBefore !== null ||
        record.creditsAfter !== null ||
        record.contractYear !== null ||
        record.actorName !== null ||
        record.actorRole !== null ||
        record.comment !== null ||
        record.manualAssignmentReason !== null ||
        record.beforeAuctionSessionTeamId !== null ||
        record.beforePlayerId !== null ||
        record.beforeAmount !== null ||
        record.beforeContractYear !== null ||
        record.afterAuctionSessionTeamId !== null ||
        record.afterPlayerId !== null ||
        record.afterAmount !== null ||
        record.afterContractYear !== null ||
        record.suspensionReason !== null
      ) {
        throw new Error(
          `Invalid SESSION_REOPENED event "${record.id}"`
        );
      }

      return {
        ...record,
        eventType:
          "SESSION_REOPENED",
        auctionCallId: null,
        auctionSessionTeamId: null,
        playerId: null,
        amount: null,
        creditsBefore: null,
        creditsAfter: null,
        contractYear: null,
        actorName: null,
        actorRole: null,
        comment: null,
        manualAssignmentReason: null,
        suspensionReason: null
      };
    }
  }
}

export interface AuctionEventRepository {
  listByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionEvent[]>;

  createWithExecutor(
    executor: DatabaseWriteExecutor,
    input: CreateAuctionEventInput
  ): AuctionEvent;
}

export class SqliteAuctionEventRepository
  implements AuctionEventRepository
{
  async listByAuctionSessionId(
    auctionSessionId: string
  ): Promise<AuctionEvent[]> {
    const records = await db
      .select()
      .from(auctionEvents)
      .where(
        eq(
          auctionEvents.auctionSessionId,
          auctionSessionId
        )
      )
      .orderBy(
        asc(auctionEvents.createdAt),
        asc(auctionEvents.id)
      );

    return records.map(mapAuctionEvent);
  }

  createWithExecutor(
    executor: DatabaseWriteExecutor,
    input: CreateAuctionEventInput
  ): AuctionEvent {
    const id = randomUUID();

    const values =
      input.eventType ===
      "AUCTION_AWARD_CONFIRMED"
        ? {
            id,
            auctionSessionId:
              input.auctionSessionId,
            auctionCallId:
              input.auctionCallId,
            eventType:
              input.eventType,
            auctionSessionTeamId:
              input.auctionSessionTeamId,
            playerId:
              input.playerId,
            amount:
              input.amount,
            creditsBefore:
              input.creditsBefore,
            creditsAfter:
              input.creditsAfter,
            contractYear: null,
            actorName: null,
            actorRole: null,
            comment: null,
            manualAssignmentReason: null,
            suspensionReason: null
          }
        : input.eventType ===
            "INITIAL_ROSTER_ENTRY_ADDED_MANUALLY"
          ? {
              id,
              auctionSessionId:
                input.auctionSessionId,
              auctionCallId: null,
              eventType:
                input.eventType,
              auctionSessionTeamId:
                input.auctionSessionTeamId,
              playerId:
                input.playerId,
              amount:
                input.amount,
              creditsBefore:
                input.creditsBefore,
              creditsAfter:
                input.creditsAfter,
              contractYear:
                input.contractYear,
              actorName:
                input.actorName,
              actorRole:
                input.actorRole,
              comment:
                input.comment ?? null,
              manualAssignmentReason: null,
              suspensionReason: null
            }
        : input.eventType ===
            "MANUAL_ROSTER_ASSIGNMENT_ADDED"
          ? {
              id,
              auctionSessionId:
                input.auctionSessionId,
              auctionCallId: null,
              eventType:
                input.eventType,
              auctionSessionTeamId:
                input.auctionSessionTeamId,
              playerId:
                input.playerId,
              amount:
                input.amount,
              creditsBefore:
                input.creditsBefore,
              creditsAfter:
                input.creditsAfter,
              contractYear:
                input.contractYear,
              actorName:
                input.actorName,
              actorRole:
                input.actorRole,
              comment:
                input.comment ?? null,
              manualAssignmentReason:
                input.manualAssignmentReason,
              suspensionReason: null
            }
        : input.eventType ===
            "TECHNICAL_ROSTER_CORRECTION"
          ? {
              id,
              auctionSessionId:
                input.auctionSessionId,
              auctionCallId: null,
              eventType:
                input.eventType,
              auctionSessionTeamId: null,
              playerId: null,
              amount: null,
              creditsBefore: null,
              creditsAfter: null,
              contractYear: null,
              actorName:
                input.actorName,
              actorRole:
                input.actorRole,
              comment:
                input.comment,
              manualAssignmentReason: null,
              beforeAuctionSessionTeamId:
                input.beforeAuctionSessionTeamId,
              beforePlayerId:
                input.beforePlayerId,
              beforeAmount:
                input.beforeAmount,
              beforeContractYear:
                input.beforeContractYear,
              afterAuctionSessionTeamId:
                input.afterAuctionSessionTeamId,
              afterPlayerId:
                input.afterPlayerId,
              afterAmount:
                input.afterAmount,
              afterContractYear:
                input.afterContractYear,
              suspensionReason: null
            }
        : input.eventType ===
            "SESSION_SUSPENDED"
          ? {
              id,
              auctionSessionId:
                input.auctionSessionId,
              auctionCallId: null,
              eventType:
                input.eventType,
              auctionSessionTeamId: null,
              playerId: null,
              amount: null,
              creditsBefore: null,
              creditsAfter: null,
              contractYear: null,
              actorName: null,
              actorRole: null,
              comment: null,
              manualAssignmentReason: null,
              suspensionReason:
                input.suspensionReason
            }
          : {
              id,
              auctionSessionId:
                input.auctionSessionId,
              auctionCallId: null,
              eventType:
                input.eventType,
              auctionSessionTeamId: null,
              playerId: null,
              amount: null,
              creditsBefore: null,
              creditsAfter: null,
              contractYear: null,
              actorName: null,
              actorRole: null,
              comment: null,
              manualAssignmentReason: null,
              suspensionReason: null
            };

    const [event] = executor
      .insert(auctionEvents)
      .values(values)
      .returning()
      .all();

    if (!event) {
      throw new Error(
        "Failed to create auction event"
      );
    }

    return mapAuctionEvent(event);
  }
}
