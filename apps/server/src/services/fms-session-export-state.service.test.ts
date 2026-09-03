import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import type {
  AuctionSession
} from "@fantaastaapp/contracts";

import type {
  FmsSessionExportPersistenceRecord
} from "../repositories/fms-session-export.repository.js";
import {
  FmsSessionExportStateService,
  FmsSessionExportStateServiceError
} from "./fms-session-export-state.service.js";

const completedSession: AuctionSession = {
  id: "session-1",
  leagueId: "league-1",
  season: "2026/2027",
  editionNumber: 35,
  status: "COMPLETED",
  suspensionReason: null,
  initialCredits: 300,
  maximumInitialRosterEntries: 11,
  remoteBaseUrl: null,
  createdAt: "2026-09-03 18:00:00",
  updatedAt: "2026-09-03 18:00:00"
};

const exportRecord:
  FmsSessionExportPersistenceRecord = {
    auctionSessionId: "session-1",
    exportedAt: "2026-09-03 18:30:00"
  };

function createService(input?: {
  session?: AuctionSession | null;
  exportRecord?:
    FmsSessionExportPersistenceRecord | null;
}) {
  const findExport =
    vi.fn(() =>
      input?.exportRecord ??
      null
    );

  const upsertExport =
    vi.fn(() => exportRecord);

  const deleteExport =
    vi.fn();

  const service =
    new FmsSessionExportStateService(
      {
        findByIdWithExecutor:
          () =>
            input &&
            "session" in input
              ? input.session ?? null
              : completedSession
      },
      {
        findByAuctionSessionIdWithExecutor:
          findExport,
        upsertWithExecutor:
          upsertExport,
        deleteByAuctionSessionIdWithExecutor:
          deleteExport
      }
    );

  return {
    service,
    findExport,
    upsertExport,
    deleteExport
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FmsSessionExportStateService", () => {
  it("reads the persisted export state", () => {
    const {
      service
    } = createService({
      exportRecord
    });

    expect(
      service.getStatus("session-1")
    ).toEqual(exportRecord);
  });

  it("returns null when the session has not been exported", () => {
    const {
      service
    } = createService();

    expect(
      service.getStatus("session-1")
    ).toBeNull();
  });

  it("rejects status lookup for a missing session", () => {
    const {
      service
    } = createService({
      session: null
    });

    expect(() =>
      service.getStatus("missing-session")
    ).toThrow(
      FmsSessionExportStateServiceError
    );
  });

  it("confirms export for a completed session", () => {
    const {
      service,
      upsertExport
    } = createService();

    expect(
      service.confirm("session-1")
    ).toEqual(exportRecord);

    expect(upsertExport)
      .toHaveBeenCalledOnce();
  });

  it("rejects export confirmation before completion", () => {
    const {
      service
    } = createService({
      session: {
        ...completedSession,
        status: "RUNNING"
      }
    });

    expect(() =>
      service.confirm("session-1")
    ).toThrow(
      expect.objectContaining({
        code:
          "AUCTION_SESSION_NOT_COMPLETED"
      })
    );
  });

  it("rejects export confirmation for a missing session", () => {
    const {
      service
    } = createService({
      session: null
    });

    expect(() =>
      service.confirm("missing-session")
    ).toThrow(
      expect.objectContaining({
        code:
          "AUCTION_SESSION_NOT_FOUND"
      })
    );
  });

  it("invalidates the persisted export state", () => {
    const {
      service,
      deleteExport
    } = createService();

    const executor =
      {} as Parameters<
        typeof service.invalidateWithExecutor
      >[0];

    service.invalidateWithExecutor(
      executor,
      "session-1"
    );

    expect(deleteExport)
      .toHaveBeenCalledWith(
        executor,
        "session-1"
      );
  });
});
