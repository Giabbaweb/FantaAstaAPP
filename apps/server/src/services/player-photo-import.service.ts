import {
  access,
  mkdir,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import {
  workspaceRoot
} from "../db/client.js";

export type PlayerPhotoImportMode =
  | "KEEP"
  | "REPLACE";

export type PlayerPhotoImportFile = {
  fileName: string;
  content: Buffer;
};

export type PlayerPhotoImportIssue = {
  fileName: string;
  reason:
    | "INVALID_FILENAME"
    | "INVALID_PNG";
};

export type PlayerPhotoImportResult = {
  selected: number;
  created: number;
  replaced: number;
  kept: number;
  rejected: number;
  issues: PlayerPhotoImportIssue[];
};

const defaultPlayerPhotosDirectory =
  path.join(
    workspaceRoot,
    "data",
    "assets",
    "player-photos"
  );

const pngSignature =
  Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a
  ]);

function isValidPlayerPhotoName(
  fileName: string
): boolean {
  return /^\d+\.png$/i.test(
    fileName
  );
}

function isPng(
  content: Buffer
): boolean {
  return (
    content.length >=
      pngSignature.length &&
    content
      .subarray(
        0,
        pngSignature.length
      )
      .equals(
        pngSignature
      )
  );
}

async function fileExists(
  filePath: string
): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

export class PlayerPhotoImportService {
  constructor(
    private readonly playerPhotosDirectory:
      string =
        defaultPlayerPhotosDirectory
  ) {}

  async importPhotos(
    files: PlayerPhotoImportFile[],
    mode: PlayerPhotoImportMode
  ): Promise<PlayerPhotoImportResult> {
    await mkdir(
      this.playerPhotosDirectory,
      {
        recursive: true
      }
    );

    const result:
      PlayerPhotoImportResult = {
        selected: files.length,
        created: 0,
        replaced: 0,
        kept: 0,
        rejected: 0,
        issues: []
      };

    for (const file of files) {
      if (
        !isValidPlayerPhotoName(
          file.fileName
        )
      ) {
        result.rejected += 1;
        result.issues.push({
          fileName: file.fileName,
          reason:
            "INVALID_FILENAME"
        });
        continue;
      }

      if (!isPng(file.content)) {
        result.rejected += 1;
        result.issues.push({
          fileName: file.fileName,
          reason: "INVALID_PNG"
        });
        continue;
      }

      const normalizedFileName =
        file.fileName.toLowerCase();

      const destination =
        path.join(
          this.playerPhotosDirectory,
          normalizedFileName
        );

      const exists =
        await fileExists(
          destination
        );

      if (
        exists &&
        mode === "KEEP"
      ) {
        result.kept += 1;
        continue;
      }

      await writeFile(
        destination,
        file.content
      );

      if (exists) {
        result.replaced += 1;
      } else {
        result.created += 1;
      }
    }

    return result;
  }
}
