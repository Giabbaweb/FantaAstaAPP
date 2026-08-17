import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  RestoreAlreadyScheduledError,
  RestoreRuntimeCoordinator
} from "./restore-runtime-coordinator.js";

const preparedRestore = {
  auctionSessionId:
    "session-1",
  fileName:
    "SFL92_2026-2027_restore.sqlite",
  sourcePath:
    "/backups/SFL92_2026-2027_restore.sqlite",
  candidatePath:
    "/data/fantaasta.sqlite.restore-candidate"
};

describe(
  "RestoreRuntimeCoordinator",
  () => {
    it(
      "prepares and schedules without waking before response flush",
      async () => {
        const wake =
          vi.fn();

        const coordinator =
          new RestoreRuntimeCoordinator(
            wake
          );

        const result =
          await coordinator
            .prepareAndSchedule(
              async () =>
                preparedRestore
            );

        expect(result)
          .toEqual(
            preparedRestore
          );

        expect(wake)
          .not.toHaveBeenCalled();

        expect(
          coordinator.peekScheduled()
        ).toEqual(
          preparedRestore
        );
      }
    );

    it(
      "rejects a concurrent restore while preparation is in progress",
      async () => {
        let resolvePreparation:
          (
            value:
              typeof preparedRestore
          ) => void =
            () => {};

        const preparation =
          new Promise<
            typeof preparedRestore
          >(
            (resolve) => {
              resolvePreparation =
                resolve;
            }
          );

        const coordinator =
          new RestoreRuntimeCoordinator();

        const first =
          coordinator
            .prepareAndSchedule(
              () => preparation
            );

        await expect(
          coordinator
            .prepareAndSchedule(
              async () => ({
                ...preparedRestore,
                fileName:
                  "another.sqlite"
              })
            )
        ).rejects.toBeInstanceOf(
          RestoreAlreadyScheduledError
        );

        resolvePreparation(
          preparedRestore
        );

        await expect(first)
          .resolves.toEqual(
            preparedRestore
          );
      }
    );

    it(
      "rejects another restore while one is scheduled",
      async () => {
        const coordinator =
          new RestoreRuntimeCoordinator();

        await coordinator
          .prepareAndSchedule(
            async () =>
              preparedRestore
          );

        await expect(
          coordinator
            .prepareAndSchedule(
              async () => ({
                ...preparedRestore,
                fileName:
                  "another.sqlite"
              })
            )
        ).rejects.toBeInstanceOf(
          RestoreAlreadyScheduledError
        );
      }
    );

    it(
      "releases the reservation when preparation fails",
      async () => {
        const coordinator =
          new RestoreRuntimeCoordinator();

        await expect(
          coordinator
            .prepareAndSchedule(
              async () => {
                throw new Error(
                  "prepare failed"
                );
              }
            )
        ).rejects.toThrow(
          "prepare failed"
        );

        await expect(
          coordinator
            .prepareAndSchedule(
              async () =>
                preparedRestore
            )
        ).resolves.toEqual(
          preparedRestore
        );
      }
    );

    it(
      "wakes exactly once after response flush",
      async () => {
        const wake =
          vi.fn();

        const coordinator =
          new RestoreRuntimeCoordinator(
            wake
          );

        await coordinator
          .prepareAndSchedule(
            async () =>
              preparedRestore
          );

        coordinator
          .markResponseFlushed();

        coordinator
          .markResponseFlushed();

        expect(wake)
          .toHaveBeenCalledTimes(1);
      }
    );

    it(
      "does not deliver before response flush and delivers once afterwards",
      async () => {
        const coordinator =
          new RestoreRuntimeCoordinator();

        await coordinator
          .prepareAndSchedule(
            async () =>
              preparedRestore
          );

        expect(
          coordinator.takeScheduled()
        ).toBeNull();

        coordinator
          .markResponseFlushed();

        expect(
          coordinator.takeScheduled()
        ).toEqual(
          preparedRestore
        );

        expect(
          coordinator.takeScheduled()
        ).toBeNull();
      }
    );

    it(
      "keeps the restore pending when runtime wake fails",
      async () => {
        const coordinator =
          new RestoreRuntimeCoordinator(
            () => {
              throw new Error(
                "runtime wake failed"
              );
            }
          );

        await coordinator
          .prepareAndSchedule(
            async () =>
              preparedRestore
          );

        expect(
          () =>
            coordinator
              .markResponseFlushed()
        ).toThrow(
          "runtime wake failed"
        );

        expect(
          coordinator.peekScheduled()
        ).toEqual(
          preparedRestore
        );

        expect(
          coordinator.takeScheduled()
        ).toBeNull();
      }
    );
  }
);
