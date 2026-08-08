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
  "AUCTION_AWARD_CONFIRMED";

export type AuctionEvent = {
  id: string;
  auctionSessionId: string;
  auctionCallId: string;
  eventType: AuctionEventType;
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
  createdAt: string;
};

export type CreateAuctionEventInput = {
  auctionSessionId: string;
  auctionCallId: string;
  eventType: AuctionEventType;
  auctionSessionTeamId: string;
  playerId: string;
  amount: number;
  creditsBefore: number;
  creditsAfter: number;
};

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
    return db
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
  }

  createWithExecutor(
    executor: DatabaseWriteExecutor,
    input: CreateAuctionEventInput
  ): AuctionEvent {
    const [event] = executor
      .insert(auctionEvents)
      .values({
        id: randomUUID(),
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
          input.creditsAfter
      })
      .returning()
      .all();

    if (!event) {
      throw new Error(
        "Failed to create auction event"
      );
    }

    return event;
  }
}
