import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  RestoreRuntimeExecutor
} from "./restore-runtime-executor.js";

const preparedRestore = {
  auctionSessionId:
    "session-1",
  fileName:
    "backup.sqlite",
  sourcePath:
    "/backups/backup.sqlite",
  candidatePath:
    "/data/fantaasta.sqlite.restore-candidate"
};

describe(
  "RestoreRuntimeExecutor",
  () => {
    it(
      "closes the application before committing the database swap",
      async () => {
        const calls: string[] = [];

        const takeScheduled =
          vi.fn(
            () =>
              preparedRestore
          );

        const closeApplication =
          vi.fn(
            async () => {
              calls.push(
                "close"
              );
            }
          );

        const commitSwap =
          vi.fn(
            async () => {
              calls.push(
                "swap"
              );

              return {
                databasePath:
                  "/data/fantaasta.sqlite"
              };
            }
          );

        const executor =
          new RestoreRuntimeExecutor({
            coordinator: {
              takeScheduled
            },
            closeApplication,
            swapService: {
              commitSwap
            },
            databasePath:
              "/data/fantaasta.sqlite"
          });

        await expect(
          executor
            .executeScheduledRestore()
        ).resolves.toEqual({
          executed: true,
          auctionSessionId:
            "session-1",
          fileName:
            "backup.sqlite",
          databasePath:
            "/data/fantaasta.sqlite"
        });

        expect(calls)
          .toEqual([
            "close",
            "swap"
          ]);

        expect(
          commitSwap
        ).toHaveBeenCalledWith({
          databasePath:
            "/data/fantaasta.sqlite",
          candidatePath:
            "/data/fantaasta.sqlite.restore-candidate"
        });
      }
    );

    it(
      "does nothing when no restore is scheduled",
      async () => {
        const closeApplication =
          vi.fn();

        const commitSwap =
          vi.fn();

        const executor =
          new RestoreRuntimeExecutor({
            coordinator: {
              takeScheduled:
                vi.fn(
                  () => null
                )
            },
            closeApplication,
            swapService: {
              commitSwap
            },
            databasePath:
              "/data/fantaasta.sqlite"
          });

        await expect(
          executor
            .executeScheduledRestore()
        ).resolves.toEqual({
          executed: false
        });

        expect(
          closeApplication
        ).not.toHaveBeenCalled();

        expect(
          commitSwap
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not swap when application shutdown fails",
      async () => {
        const commitSwap =
          vi.fn();

        const executor =
          new RestoreRuntimeExecutor({
            coordinator: {
              takeScheduled:
                vi.fn(
                  () =>
                    preparedRestore
                )
            },
            closeApplication:
              vi.fn(
                async () => {
                  throw new Error(
                    "shutdown failed"
                  );
                }
              ),
            swapService: {
              commitSwap
            },
            databasePath:
              "/data/fantaasta.sqlite"
          });

        await expect(
          executor
            .executeScheduledRestore()
        ).rejects.toThrow(
          "shutdown failed"
        );

        expect(
          commitSwap
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "propagates swap failures after shutdown",
      async () => {
        const expectedError =
          new Error(
            "swap failed"
          );

        const executor =
          new RestoreRuntimeExecutor({
            coordinator: {
              takeScheduled:
                vi.fn(
                  () =>
                    preparedRestore
                )
            },
            closeApplication:
              vi.fn(
                async () => {}
              ),
            swapService: {
              commitSwap:
                vi.fn(
                  async () => {
                    throw expectedError;
                  }
                )
            },
            databasePath:
              "/data/fantaasta.sqlite"
          });

        await expect(
          executor
            .executeScheduledRestore()
        ).rejects.toBe(
          expectedError
        );
      }
    );

    it(
      "cannot execute the same prepared restore twice",
      async () => {
        const takeScheduled =
          vi.fn(
            () =>
              preparedRestore
          );

        const closeApplication =
          vi.fn(
            async () => {}
          );

        const commitSwap =
          vi.fn(
            async () => ({
              databasePath:
                "/data/fantaasta.sqlite"
            })
          );

        const executor =
          new RestoreRuntimeExecutor({
            coordinator: {
              takeScheduled
            },
            closeApplication,
            swapService: {
              commitSwap
            },
            databasePath:
              "/data/fantaasta.sqlite"
          });

        await executor
          .executeScheduledRestore();

        await expect(
          executor
            .executeScheduledRestore()
        ).resolves.toEqual({
          executed: false
        });

        expect(
          takeScheduled
        ).toHaveBeenCalledTimes(1);

        expect(
          closeApplication
        ).toHaveBeenCalledTimes(1);

        expect(
          commitSwap
        ).toHaveBeenCalledTimes(1);
      }
    );
  }
);
