import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  buildApp
} from "../app.js";

describe(
  "recovery point catalog routes",
  () => {
    const listForAuctionSession =
      vi.fn();

    let app: Awaited<
      ReturnType<typeof buildApp>
    >;

    beforeAll(async () => {
      app = await buildApp({
        recoveryPointCatalogService: {
          listForAuctionSession
        }
      });
    });

    afterAll(async () => {
      await app.close();
    });

    it(
      "returns recovery points for an auction session",
      async () => {
        listForAuctionSession
          .mockResolvedValueOnce([
            {
              createdAt:
                "2026-08-17T21:00:00.000Z",
              reason:
                "MANUAL_BACKUP",
              league: {
                id: "league-1",
                name: "SFL'92"
              },
              auctionSession: {
                id: "session-1",
                season: "2026/2027",
                editionNumber: 35,
                status: "SUSPENDED",
                stateVersion: 12
              },
              database: {
                fileName:
                  "SFL92_2026-2027_MANUAL-BACKUP.sqlite",
                sizeBytes: 208896,
                latestMigration: {
                  hash:
                    "migration-hash",
                  createdAt:
                    1786834202989
                }
              },
              integrity: {
                status: "VALID",
                messages: ["ok"]
              },
              timing: {
                backupDurationMs: 17.3,
                totalDurationMs: 33
              }
            }
          ]);

        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/auction-sessions/" +
              "session-1/backups"
          });

        expect(response.statusCode)
          .toBe(200);

        expect(
          listForAuctionSession
        ).toHaveBeenCalledWith(
          "session-1"
        );

        expect(response.json())
          .toEqual({
            data: [
              expect.objectContaining({
                reason:
                  "MANUAL_BACKUP",
                league: {
                  id: "league-1",
                  name: "SFL'92"
                },
                auctionSession:
                  expect.objectContaining({
                    id: "session-1",
                    season:
                      "2026/2027"
                  }),
                integrity:
                  expect.objectContaining({
                    status: "VALID"
                  })
              })
            ],
            error: null
          });

        expect(response.body)
          .not.toContain(
            "manifestPath"
          );

        expect(response.body)
          .not.toContain(
            "sqlitePath"
          );
      }
    );

    it(
      "returns an empty catalog when the session has no recovery points",
      async () => {
        listForAuctionSession
          .mockResolvedValueOnce([]);

        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/auction-sessions/" +
              "session-without-backups/backups"
          });

        expect(response.statusCode)
          .toBe(200);

        expect(response.json())
          .toEqual({
            data: [],
            error: null
          });
      }
    );

    it(
      "returns 500 when the catalog cannot be read",
      async () => {
        listForAuctionSession
          .mockRejectedValueOnce(
            new Error(
              "filesystem unavailable"
            )
          );

        const response =
          await app.inject({
            method: "GET",
            url:
              "/api/auction-sessions/" +
              "session-1/backups"
          });

        expect(response.statusCode)
          .toBe(500);

        expect(response.json())
          .toEqual({
            data: null,
            error: {
              code:
                "RECOVERY_POINT_CATALOG_FAILED",
              message:
                "Recovery point catalog could not be read"
            }
          });
      }
    );
  }
);
