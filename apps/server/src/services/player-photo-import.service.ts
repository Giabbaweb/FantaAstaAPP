import {
  access,
  mkdir,
  rm,
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
    | "INVALID_IMAGE";
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

const managedExtensions = [
  "png",
  "jpg",
  "jpeg"
] as const;

type ManagedExtension =
  (typeof managedExtensions)[number];

function parsePlayerPhotoName(
  fileName: string
): {
  fmsCode: string;
  extension: ManagedExtension;
} | null {
  const match =
    /^(\d+)\.(png|jpe?g)$/i.exec(
      fileName
    );

  if (
    !match ||
    !match[1] ||
    !match[2]
  ) {
    return null;
  }

  return {
    fmsCode: match[1],
    extension:
      match[2].toLowerCase() as
        ManagedExtension
  };
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

function isJpeg(
  content: Buffer
): boolean {
  return (
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff
  );
}

function isValidImage(
  extension: ManagedExtension,
  content: Buffer
): boolean {
  if (extension === "png") {
    return isPng(content);
  }

  return isJpeg(content);
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
      const parsedName =
        parsePlayerPhotoName(
          file.fileName
        );

      if (!parsedName) {
        result.rejected += 1;
        result.issues.push({
          fileName: file.fileName,
          reason:
            "INVALID_FILENAME"
        });
        continue;
      }

      if (
        !isValidImage(
          parsedName.extension,
          file.content
        )
      ) {
        result.rejected += 1;
        result.issues.push({
          fileName: file.fileName,
          reason:
            "INVALID_IMAGE"
        });
        continue;
      }

      const existingPaths =
        (
          await Promise.all(
            managedExtensions.map(
              async (extension) => {
                const candidatePath =
                  path.join(
                    this.playerPhotosDirectory,
                    `${parsedName.fmsCode}.${extension}`
                  );

                return (
                  await fileExists(
                    candidatePath
                  )
                )
                  ? candidatePath
                  : null;
              }
            )
          )
        ).filter(
          (
            candidate
          ): candidate is string =>
            candidate !== null
        );

      if (
        existingPaths.length > 0 &&
        mode === "KEEP"
      ) {
        result.kept += 1;
        continue;
      }

      const destination =
        path.join(
          this.playerPhotosDirectory,
          `${parsedName.fmsCode}.${parsedName.extension}`
        );

      if (existingPaths.length > 0) {
        await Promise.all(
          existingPaths.map(
            (existingPath) =>
              rm(
                existingPath,
                {
                  force: true
                }
              )
          )
        );
      }

      await writeFile(
        destination,
        file.content
      );

      if (existingPaths.length > 0) {
        result.replaced += 1;
      } else {
        result.created += 1;
      }
    }

    return result;
  }
}
