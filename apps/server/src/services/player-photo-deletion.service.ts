import {
  readdir,
  rm
} from "node:fs/promises";
import path from "node:path";

import {
  workspaceRoot
} from "../db/client.js";

export type PlayerPhotoDeletionResult = {
  deleted: number;
};

const defaultPlayerPhotosDirectory =
  path.join(
    workspaceRoot,
    "data",
    "assets",
    "player-photos"
  );

function isManagedPlayerPhoto(
  fileName: string
): boolean {
  return /^\d+\.png$/i.test(
    fileName
  );
}

export class PlayerPhotoDeletionService {
  constructor(
    private readonly playerPhotosDirectory:
      string =
        defaultPlayerPhotosDirectory
  ) {}

  async deleteAll():
    Promise<PlayerPhotoDeletionResult> {
    let entries;

    try {
      entries =
        await readdir(
          this.playerPhotosDirectory,
          {
            withFileTypes: true
          }
        );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return {
          deleted: 0
        };
      }

      throw error;
    }

    const managedFiles =
      entries.filter(
        (entry) =>
          entry.isFile() &&
          isManagedPlayerPhoto(
            entry.name
          )
      );

    await Promise.all(
      managedFiles.map(
        (entry) =>
          rm(
            path.join(
              this.playerPhotosDirectory,
              entry.name
            ),
            {
              force: true
            }
          )
      )
    );

    return {
      deleted:
        managedFiles.length
    };
  }
}
