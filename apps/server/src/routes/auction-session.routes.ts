import type {
  AuctionSession
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import {
  AuctionSessionService
} from "../services/auction-session.service.js";

type AuctionSessionListResponse = {
  data: AuctionSession[];
  error: null;
};

const repository =
  new SqliteAuctionSessionRepository();

const service =
  new AuctionSessionService(repository);

export const auctionSessionRoutes: FastifyPluginAsync =
  async (fastify) => {
    fastify.get<{
      Reply: AuctionSessionListResponse;
    }>(
      "/api/auction-sessions",
      async (_request, reply) => {
        const sessions =
          await service.listSessions();

        return reply.code(200).send({
          data: sessions,
          error: null
        });
      }
    );
  };
