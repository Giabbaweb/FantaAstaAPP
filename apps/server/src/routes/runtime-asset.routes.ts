import {
  readFile
} from "node:fs/promises";
import path from "node:path";

import type {
  FastifyPluginAsync
} from "fastify";

import {
  workspaceRoot
} from "../db/client.js";

type RuntimeAssetParams = {
  "*": string;
};

type RuntimeAssetErrorResponse = {
  data: null;
  error: {
    code: "ASSET_NOT_FOUND";
    message: string;
  };
};

const assetsRoot =
  path.resolve(
    workspaceRoot,
    "data",
    "assets"
  );

const contentTypes =
  new Map<string, string>([
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".webp", "image/webp"]
  ]);

function resolveAssetPath(
  relativePath: string
): {
  filePath: string;
  contentType: string;
} | null {
  const extension =
    path.extname(
      relativePath
    ).toLowerCase();

  const contentType =
    contentTypes.get(extension);

  if (!contentType) {
    return null;
  }

  const filePath =
    path.resolve(
      assetsRoot,
      relativePath
    );

  const assetPrefix =
    `${assetsRoot}${path.sep}`;

  if (
    !filePath.startsWith(
      assetPrefix
    )
  ) {
    return null;
  }

  return {
    filePath,
    contentType
  };
}

export const runtimeAssetRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Params: RuntimeAssetParams;
        Reply:
          | Buffer
          | RuntimeAssetErrorResponse;
      }>(
        "/assets/*",
        async (request, reply) => {
          const resolved =
            resolveAssetPath(
              request.params["*"]
            );

          if (!resolved) {
            return reply
              .code(404)
              .send({
                data: null,
                error: {
                  code:
                    "ASSET_NOT_FOUND",
                  message:
                    "Asset non trovato"
                }
              });
          }

          try {
            const content =
              await readFile(
                resolved.filePath
              );

            return reply
              .code(200)
              .type(
                resolved.contentType
              )
              .send(content);
          } catch (error) {
            if (
              error instanceof Error &&
              "code" in error &&
              error.code === "ENOENT"
            ) {
              return reply
                .code(404)
                .send({
                  data: null,
                  error: {
                    code:
                      "ASSET_NOT_FOUND",
                    message:
                      "Asset non trovato"
                  }
                });
            }

            throw error;
          }
        }
      );
    };
