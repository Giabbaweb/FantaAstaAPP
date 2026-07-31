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

type AuctionCallCommandParams = {
  id: string;
  command: string;
};

type OpenAuctionCallBody = {
  openingBid?: unknown;
};

type InvalidRequestResponse = {
  data: null;
  error: {
    code: "INVALID_REQUEST";
    message: string;
  };
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

type AuctionCallCommandResponse = {
  data: AuctionCallAggregate;
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

    fastify.post<{
      Params: AuctionCallCommandParams;
      Body: OpenAuctionCallBody;
      Reply:
        | AuctionCallCommandResponse
        | InvalidRequestResponse
        | AuctionCallNotFoundResponse;
    }>(
      "/api/auction-calls/:id/commands/:command",
      async (request, reply) => {
        const { id, command } = request.params;

        if (command !== "open") {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                `Unknown auction call command "${command}"`
            }
          });
        }

        const openingBid = request.body?.openingBid;

        if (
          !Number.isInteger(openingBid) ||
          typeof openingBid !== "number" ||
          openingBid < 1
        ) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"openingBid" must be an integer greater than or equal to 1'
            }
          });
        }

        try {
          const aggregate = await service.open(
            id,
            openingBid
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
