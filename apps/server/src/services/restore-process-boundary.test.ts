import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  RestoreProcessBoundary
} from "./restore-process-boundary.js";

async function flushPromises():
  Promise<void> {
  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        0
      );
    }
  );
}

describe(
  "RestoreProcessBoundary",
  () => {
    it(
      "exits with zero after a successful restore",
      async () => {
        const executeScheduledRestore =
          vi.fn(
            async () => ({
              executed: true as const,
              auctionSessionId:
                "session-1",
              fileName:
                "backup.sqlite",
              databasePath:
                "/data/fantaasta.sqlite"
            })
          );

        const exit =
          vi.fn();

        const info =
          vi.fn();

        const error =
          vi.fn();

        const technicalInfo =
          vi.fn();

        const technicalError =
          vi.fn();

        const boundary =
          new RestoreProcessBoundary({
            executor: {
              executeScheduledRestore
            },
            exit,
            logger: {
              info,
              error
            },
            technicalLogger: {
              info:
                technicalInfo,
              error:
                technicalError
            }
          });

        boundary.wake();

        await flushPromises();

        expect(
          executeScheduledRestore
        ).toHaveBeenCalledTimes(1);

        expect(info)
          .toHaveBeenCalledTimes(1);

        expect(error)
          .not.toHaveBeenCalled();

        expect(
          technicalInfo
        ).toHaveBeenCalledWith({
          event:
            "RESTORE_COMPLETED",
          auctionSessionId:
            "session-1",
          fileName:
            "backup.sqlite"
        });

        expect(
          technicalError
        ).not.toHaveBeenCalled();

        expect(exit)
          .toHaveBeenCalledWith(0);
      }
    );

    it(
      "exits with one when restore execution fails",
      async () => {
        const expectedError =
          new Error(
            "swap failed"
          );

        const exit =
          vi.fn();

        const info =
          vi.fn();

        const error =
          vi.fn();

        const technicalError =
          vi.fn();

        const boundary =
          new RestoreProcessBoundary({
            executor: {
              executeScheduledRestore:
                vi.fn(
                  async () => {
                    throw expectedError;
                  }
                )
            },
            exit,
            logger: {
              info,
              error
            },
            technicalLogger: {
              info:
                vi.fn(),
              error:
                technicalError
            }
          });

        boundary.wake();

        await flushPromises();

        expect(info)
          .not.toHaveBeenCalled();

        expect(error)
          .toHaveBeenCalledWith(
            expect.objectContaining({
              error:
                expectedError,
              operation:
                "recovery-point-restore"
            }),
            "Recovery point restore failed after runtime wake"
          );

        expect(
          technicalError
        ).toHaveBeenCalledWith({
          event:
            "RESTORE_FAILED",
          error:
            expectedError
        });

        expect(exit)
          .toHaveBeenCalledWith(1);
      }
    );

    it(
      "does not exit when wake finds no scheduled restore",
      async () => {
        const exit =
          vi.fn();

        const boundary =
          new RestoreProcessBoundary({
            executor: {
              executeScheduledRestore:
                vi.fn(
                  async () => ({
                    executed:
                      false as const
                  })
                )
            },
            exit,
            logger: {
              info:
                vi.fn(),
              error:
                vi.fn()
            }
          });

        boundary.wake();

        await flushPromises();

        expect(exit)
          .not.toHaveBeenCalled();
      }
    );

    it(
      "ignores concurrent wakes while execution is running",
      async () => {
        let resolveExecution:
          (
            value: {
              executed: false;
            }
          ) => void =
            () => {};

        const executeScheduledRestore =
          vi.fn(
            () =>
              new Promise<{
                executed: false;
              }>(
                (resolve) => {
                  resolveExecution =
                    resolve;
                }
              )
          );

        const boundary =
          new RestoreProcessBoundary({
            executor: {
              executeScheduledRestore
            },
            exit:
              vi.fn(),
            logger: {
              info:
                vi.fn(),
              error:
                vi.fn()
            }
          });

        boundary.wake();
        boundary.wake();
        boundary.wake();

        expect(
          executeScheduledRestore
        ).toHaveBeenCalledTimes(1);

        resolveExecution({
          executed: false
        });

        await flushPromises();
      }
    );
  }
);
