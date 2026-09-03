import {
  db
} from "../db/client.js";
import type {
  DatabaseWriteExecutor
} from "../db/client.js";
import type {
  AuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import type {
  FmsSessionExportPersistenceRecord,
  FmsSessionExportRepository
} from "../repositories/fms-session-export.repository.js";

export type FmsSessionExportStateServiceErrorCode =
  | "AUCTION_SESSION_NOT_FOUND"
  | "AUCTION_SESSION_NOT_COMPLETED";

export class FmsSessionExportStateServiceError
  extends Error
{
  readonly code:
    FmsSessionExportStateServiceErrorCode;

  constructor(
    code: FmsSessionExportStateServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "FmsSessionExportStateServiceError";
    this.code = code;
  }
}

export class FmsSessionExportStateService {
  constructor(
    private readonly auctionSessionRepository:
      Pick<
        AuctionSessionRepository,
        "findByIdWithExecutor"
      >,
    private readonly exportRepository:
      FmsSessionExportRepository
  ) {}

  getStatus(
    auctionSessionId: string
  ): FmsSessionExportPersistenceRecord | null {
    return db.transaction((tx) => {
      const auctionSession =
        this.auctionSessionRepository
          .findByIdWithExecutor(
            tx,
            auctionSessionId
          );

      if (!auctionSession) {
        throw new FmsSessionExportStateServiceError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      return this.exportRepository
        .findByAuctionSessionIdWithExecutor(
          tx,
          auctionSessionId
        );
    });
  }

  confirm(
    auctionSessionId: string
  ): FmsSessionExportPersistenceRecord {
    return db.transaction((tx) => {
      const auctionSession =
        this.auctionSessionRepository
          .findByIdWithExecutor(
            tx,
            auctionSessionId
          );

      if (!auctionSession) {
        throw new FmsSessionExportStateServiceError(
          "AUCTION_SESSION_NOT_FOUND",
          `Auction session "${auctionSessionId}" was not found`
        );
      }

      if (
        auctionSession.status !==
        "COMPLETED"
      ) {
        throw new FmsSessionExportStateServiceError(
          "AUCTION_SESSION_NOT_COMPLETED",
          `FMS session export can only be confirmed from auction session status "COMPLETED", current status is "${auctionSession.status}"`
        );
      }

      return this.exportRepository
        .upsertWithExecutor(
          tx,
          auctionSessionId
        );
    });
  }

  invalidateWithExecutor(
    executor: DatabaseWriteExecutor,
    auctionSessionId: string
  ): void {
    this.exportRepository
      .deleteByAuctionSessionIdWithExecutor(
        executor,
        auctionSessionId
      );
  }
}
