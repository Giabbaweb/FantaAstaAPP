import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapAuctionCallError
} from "../http/auction-call-errors.js";
import type {
  AuctionCallNotFoundResponse
} from "../http/auction-call-errors.js";
import {
  SqliteAuctionCallRepository
} from "../repositories/auction-call.repository.js";
import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import {
  AuctionCallService
} from "../services/auction-call.service.js";

type AuctionCallParams = {
  id: string;
};

type AuctionSessionParams = {
  auctionSessionId: string;
};

type AuctionCallDetailResponse = {
  data: AuctionCallAggregate;
  error: null;
};

type OperationalAuctionCallResponse = {
  data: AuctionCallAggregate | null;
  error: null;
};

const repository =
  new SqliteAuctionCallRepository();

const service =
  new AuctionCallService(repository);

export const auctionCallRoutes: FastifyPluginAsync =
  async (fastify) => {
    fastify.get<{
      Params: AuctionCallParams;
      Reply:
        | AuctionCallDetailResponse
        | AuctionCallNotFoundResponse;
    }>(
      "/api/auction-calls/:id",
      async (request, reply) => {
        try {
          const aggregate =
            await service.getById(
              request.params.id
            );

          return reply.code(200).send({
            data: aggregate,
            error: null
          });
        } catch (error) {
          const mapped =
            mapAuctionCallError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );

    fastify.get<{
      Params: AuctionSessionParams;
      Reply: OperationalAuctionCallResponse;
    }>(
      "/api/auction-sessions/:auctionSessionId/auction-call",
      async (request, reply) => {
        const aggregate =
          await service
            .getOperationalByAuctionSessionId(
              request.params.auctionSessionId
            );

        return reply.code(200).send({
          data: aggregate,
          error: null
        });
      }
    );
  };
