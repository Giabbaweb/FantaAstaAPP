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

type AuctionCallCommandBody = {
  openingBid?: unknown;
  auctionSessionTeamId?: unknown;
  bid?: unknown;
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
      Body: AuctionCallCommandBody;
      Reply:
        | AuctionCallCommandResponse
        | InvalidRequestResponse
        | AuctionCallNotFoundResponse;
    }>(
      "/api/auction-calls/:id/commands/:command",
      async (request, reply) => {
        const { id, command } = request.params;
        const body = request.body ?? {};

        try {
          let aggregate: AuctionCallAggregate;

          switch (command) {
            case "open": {
              const openingBid = body.openingBid;

              if (
                typeof openingBid !== "number" ||
                !Number.isInteger(openingBid) ||
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

              aggregate = await service.open(
                id,
                openingBid
              );

              break;
            }

            case "bid": {
              const auctionSessionTeamId =
                body.auctionSessionTeamId;
              const bid = body.bid;

              if (
                typeof auctionSessionTeamId !==
                  "string" ||
                auctionSessionTeamId.trim().length === 0
              ) {
                return reply.code(400).send({
                  data: null,
                  error: {
                    code: "INVALID_REQUEST",
                    message:
                      '"auctionSessionTeamId" must be a non-empty string'
                  }
                });
              }

              if (
                typeof bid !== "number" ||
                !Number.isInteger(bid) ||
                bid < 1
              ) {
                return reply.code(400).send({
                  data: null,
                  error: {
                    code: "INVALID_REQUEST",
                    message:
                      '"bid" must be an integer greater than or equal to 1'
                  }
                });
              }

              aggregate = await service.placeBid(
                id,
                auctionSessionTeamId,
                bid
              );

              break;
            }

            case "pass": {
              const auctionSessionTeamId =
                body.auctionSessionTeamId;

              if (
                typeof auctionSessionTeamId !==
                  "string" ||
                auctionSessionTeamId.trim().length === 0
              ) {
                return reply.code(400).send({
                  data: null,
                  error: {
                    code: "INVALID_REQUEST",
                    message:
                      '"auctionSessionTeamId" must be a non-empty string'
                  }
                });
              }

              aggregate = await service.passTurn(
                id,
                auctionSessionTeamId
              );

              break;
            }

            case "undo-pass": {
              const auctionSessionTeamId =
                body.auctionSessionTeamId;

              if (
                typeof auctionSessionTeamId !==
                  "string" ||
                auctionSessionTeamId.trim().length === 0
              ) {
                return reply.code(400).send({
                  data: null,
                  error: {
                    code: "INVALID_REQUEST",
                    message:
                      '"auctionSessionTeamId" must be a non-empty string'
                  }
                });
              }

              aggregate = await service.undoPass(
                id,
                auctionSessionTeamId
              );

              break;
            }

            default:
              return reply.code(400).send({
                data: null,
                error: {
                  code: "INVALID_REQUEST",
                  message:
                    `Unknown auction call command "${command}"`
                }
              });
          }

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
