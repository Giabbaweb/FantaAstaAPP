import type {
  FastifyPluginAsync
} from "fastify";

import {
  PlayerPhotoCatalogService
} from "../services/player-photo-catalog.service.js";

type PlayerPhotoCatalogResponse = {
  data: {
    count: number;
    lastUpdatedAt: string | null;
  };
  error: null;
};

const service =
  new PlayerPhotoCatalogService();

export const playerPhotoRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Reply: PlayerPhotoCatalogResponse;
      }>(
        "/api/player-photos",
        async (_request, reply) => {
          const catalog =
            await service.getCatalog();

          return reply
            .code(200)
            .send({
              data: catalog,
              error: null
            });
        }
      );
    };
