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
  | "SESSION_SUSPENDED"
  | "SESSION_RESUMED";

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
  suspensionReason: null;
  createdAt: string;
};

export type AuctionEvent =
  | AuctionAwardConfirmedEvent
  | AuctionSessionSuspendedEvent
  | AuctionSessionResumedEvent;

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

export type CreateAuctionEventInput =
  | CreateAuctionAwardConfirmedEventInput
  | CreateAuctionSessionSuspendedEventInput
  | CreateAuctionSessionResumedEventInput;

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
