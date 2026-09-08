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

function parsePlayerPhotoCode(
  fileName: string
): string | null {
  const match =
    /^(\d+)\.(png|jpe?g)$/i.exec(
      fileName
    );

  return match?.[1] ?? null;
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

    const managedPhotoNames =
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            parsePlayerPhotoCode(
              entry.name
            ) !== null
        )
        .map(
          (entry) => entry.name
        );

    if (managedPhotoNames.length === 0) {
      return {
        count: 0,
        lastUpdatedAt: null
      };
    }

    const stats =
      await Promise.all(
        managedPhotoNames.map(
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

    const uniqueFmsCodes =
      new Set(
        managedPhotoNames
          .map(
            (fileName) =>
              parsePlayerPhotoCode(
                fileName
              )
          )
          .filter(
            (
              fmsCode
            ): fmsCode is string =>
              fmsCode !== null
          )
      );

    return {
      count: uniqueFmsCodes.size,
      lastUpdatedAt:
        new Date(
          latestMtimeMs
        ).toISOString()
    };
  }
}
