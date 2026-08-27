import {
  readdir,
  stat
} from "node:fs/promises";
import path from "node:path";

import {
  workspaceRoot
} from "../db/client.js";

export type PlayerPhotoCatalog = {
  count: number;
  lastUpdatedAt: string | null;
};

const defaultPlayerPhotosDirectory =
  path.join(
    workspaceRoot,
    "data",
    "assets",
    "player-photos"
  );

function isPlayerPhotoFile(
  fileName: string
): boolean {
  return /^\d+\.png$/i.test(
    fileName
  );
}

export class PlayerPhotoCatalogService {
  constructor(
    private readonly playerPhotosDirectory:
      string =
        defaultPlayerPhotosDirectory
  ) {}

  async getCatalog():
    Promise<PlayerPhotoCatalog> {
    let entries;

    try {
      entries = await readdir(
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
          count: 0,
          lastUpdatedAt: null
        };
      }

      throw error;
    }

    const photoNames =
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            isPlayerPhotoFile(
              entry.name
            )
        )
        .map(
          (entry) => entry.name
        );

    if (photoNames.length === 0) {
      return {
        count: 0,
        lastUpdatedAt: null
      };
    }

    const stats =
      await Promise.all(
        photoNames.map(
          (fileName) =>
            stat(
              path.join(
                this.playerPhotosDirectory,
                fileName
              )
            )
        )
      );

    const latestMtimeMs =
      Math.max(
        ...stats.map(
          (fileStat) =>
            fileStat.mtimeMs
        )
      );

    return {
      count: photoNames.length,
      lastUpdatedAt:
        new Date(
          latestMtimeMs
        ).toISOString()
    };
  }
}
