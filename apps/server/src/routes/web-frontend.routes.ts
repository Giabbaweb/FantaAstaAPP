import path from "node:path";
import {
  fileURLToPath
} from "node:url";

import fastifyStatic from "@fastify/static";

import type {
  FastifyPluginAsync
} from "fastify";

type StaticFileParams = {
  "*": string;
};

type WebFrontendRoutesOptions = {
  root?: string;
};

const currentDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const workspaceRoot =
  path.resolve(
    currentDirectory,
    "../../../.."
  );

const webDistRoot =
  path.join(
    workspaceRoot,
    "apps",
    "web",
    "dist"
  );

const spaRoutes = [
  "/",
  "/readme-first",
  "/public",
  "/admin",
  "/admin/config",
  "/remote",
  "/remote/all"
] as const;

export const webFrontendRoutes:
  FastifyPluginAsync<
    WebFrontendRoutesOptions
  > =
  async (app, options) => {
    await app.register(
      fastifyStatic,
      {
        root:
          options.root ??
          webDistRoot,
        serve: false
      }
    );

    app.get<{
      Params: StaticFileParams;
    }>(
      "/static/*",
      async (request, reply) => {
        return reply.sendFile(
          `static/${request.params["*"]}`
        );
      }
    );

    app.get<{
      Params: StaticFileParams;
    }>(
      "/branding/*",
      async (request, reply) => {
        return reply.sendFile(
          `branding/${request.params["*"]}`
        );
      }
    );

    app.get<{
      Params: StaticFileParams;
    }>(
      "/docs/*",
      async (request, reply) => {
        return reply.sendFile(
          `docs/${request.params["*"]}`
        );
      }
    );

    app.get(
      "/apple-touch-icon.png",
      async (_request, reply) => {
        return reply.sendFile(
          "apple-touch-icon.png"
        );
      }
    );

    app.get(
      "/favicon.ico",
      async (_request, reply) => {
        return reply.sendFile(
          "favicon.ico"
        );
      }
    );

    for (const route of spaRoutes) {
      app.get(
        route,
        async (_request, reply) => {
          return reply.sendFile(
            "index.html"
          );
        }
      );
    }
  };
