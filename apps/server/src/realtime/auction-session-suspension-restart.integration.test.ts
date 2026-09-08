import {
  describe,
  expect,
  it
} from "vitest";

import {
  db
} from "../db/client.js";
import {
  auctionSessions,
  leagues
} from "../db/schema/index.js";
import {
  SqliteAuctionCallRepository
} from "../repositories/auction-call.repository.js";
import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import {
  SqliteAuctionEventRepository
} from "../repositories/auction-event.repository.js";
import {
  AuctionSessionOperationalCommandService
} from "../services/auction-session-operational-command.service.js";
import {
  AtomicAuctionSessionCommandExecutor
} from "./atomic-auction-session-command.executor.js";
import {
  SqliteAuctionSessionStateRepository
} from "./auction-session-state.repository.js";
import {
  SqliteCommandRegistryRepository
} from "./command-registry.repository.js";
import {
  SqliteRealtimePublicDisplayReader,
  SqliteRealtimeSnapshotSessionReader,
  SqliteRealtimeSnapshotTeamReader
} from "./realtime-snapshot.repository.js";
import {
  RealtimeSnapshotService
} from "./realtime-snapshot.service.js";

describe(
  "auction session suspension restart resilience",
  () => {
    it(
      "reconstructs suspended operational state from persisted data",
      async () => {
        const leagueId =
          "league-suspension-restart";

        const auctionSessionId =
          "session-suspension-restart";

        await db.insert(leagues).values({
          id: leagueId,
          name:
            "Suspension Restart League",
          normalizedName:
            "suspension restart league"
        });

        await db
          .insert(auctionSessions)
          .values({
            id: auctionSessionId,
            leagueId,
            season: "2026/2027",
            editionNumber: 35,
            initialCredits: 330,
            status: "RUNNING",
            suspensionReason: null,
            stateVersion: 0
          });

        const firstExecutor =
          new AtomicAuctionSessionCommandExecutor(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionStateRepository(),
            new SqliteCommandRegistryRepository(),
            new SqliteAuctionEventRepository(),
            new SqliteAuctionCallRepository()
          );

        const firstService =
          new AuctionSessionOperationalCommandService(
            firstExecutor
          );

        const suspendResult =
          await firstService.suspend({
            auctionSessionId,
            commandId:
              "restart-suspend-command",
            expectedStateVersion: 0,
            reason: "PIZZA_BREAK"
          });

        expect(
          suspendResult
        ).toMatchObject({
          stateVersion: 1,
          idempotentReplay: false,
          session: {
            id: auctionSessionId,
            status: "SUSPENDED",
            suspensionReason:
              "PIZZA_BREAK"
          }
        });

        /*
         * Simula il confine rilevante di un restart:
         * nessuna istanza operativa precedente viene
         * riutilizzata. Lo snapshot viene ricostruito
         * da nuovi repository/service leggendo soltanto
         * lo stato persistito nel database.
         */
        const restartedSnapshotService =
          new RealtimeSnapshotService(
            new SqliteRealtimeSnapshotSessionReader(),
            new SqliteRealtimeSnapshotTeamReader(),
            new SqliteAuctionCallRepository(),
            new SqliteRealtimePublicDisplayReader(),
            () =>
              "2026-08-13T20:45:00.000Z"
          );

        const restartedSnapshot =
          await restartedSnapshotService
            .buildSnapshot(
              auctionSessionId
            );

        expect(
          restartedSnapshot.stateVersion
        ).toBe(1);

        expect(
          restartedSnapshot.session.status
        ).toBe("SUSPENDED");

        expect(
          restartedSnapshot.session
            .suspensionReason
        ).toBe("PIZZA_BREAK");

        /*
         * Nessun auto-resume deve essere avvenuto:
         * una nuova catena di comando deve poter
         * riprendere esplicitamente la sessione
         * partendo dalla stateVersion persistita.
         */
        const restartedExecutor =
          new AtomicAuctionSessionCommandExecutor(
            new SqliteAuctionSessionRepository(),
            new SqliteAuctionSessionStateRepository(),
            new SqliteCommandRegistryRepository(),
            new SqliteAuctionEventRepository(),
            new SqliteAuctionCallRepository()
          );

        const restartedService =
          new AuctionSessionOperationalCommandService(
            restartedExecutor
          );

        const resumeResult =
          await restartedService.resume({
            auctionSessionId,
            commandId:
              "restart-resume-command",
            expectedStateVersion: 1
          });

        expect(
          resumeResult
        ).toMatchObject({
          stateVersion: 2,
          idempotentReplay: false,
          session: {
            id: auctionSessionId,
            status: "RUNNING",
            suspensionReason: null
          }
        });
      }
    );
  }
);
