import {
  createAuctionSessionSchema
} from "@fantaastaapp/contracts";
import type {
  AuctionSession,
  CreateAuctionSessionInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import {
  AuctionSessionService,
  AuctionSessionServiceError
} from "../services/auction-session.service.js";

type AuctionSessionListResponse = {
  data: AuctionSession[];
  error: null;
};

type AuctionSessionDetailResponse = {
  data: AuctionSession;
  error: null;
};

type AuctionSessionNotFoundResponse = {
  data: null;
  error: {
    code: "AUCTION_SESSION_NOT_FOUND";
    message: string;
  };
};

type AuctionSessionParams = {
  id: string;
};

type CreateAuctionSessionResponse = {
  data: AuctionSession;
  error: null;
};

type InvalidRequestResponse = {
  data: null;
  error: {
    code: "INVALID_REQUEST";
    message: string;
  };
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

    fastify.get<{
      Params: AuctionSessionParams;
      Reply:
        | AuctionSessionDetailResponse
        | AuctionSessionNotFoundResponse;
    }>(
      "/api/auction-sessions/:id",
      async (request, reply) => {
        try {
          const session =
            await service.getSessionById(
              request.params.id
            );

          return reply.code(200).send({
            data: session,
            error: null
          });
        } catch (error) {
          if (
            error instanceof AuctionSessionServiceError &&
            error.code === "SESSION_NOT_FOUND"
          ) {
            return reply.code(404).send({
              data: null,
              error: {
                code: "AUCTION_SESSION_NOT_FOUND",
                message: error.message
              }
            });
          }

          throw error;
        }
      }
    );

    fastify.post<{
      Body: CreateAuctionSessionInput;
      Reply:
        | CreateAuctionSessionResponse
        | InvalidRequestResponse;
    }>(
      "/api/auction-sessions",
      async (request, reply) => {
        const validation =
          createAuctionSessionSchema.safeParse(
            request.body
          );

        if (!validation.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                validation.error.issues
                  .map((issue) => issue.message)
                  .join("; ")
            }
          });
        }

        const session =
          await service.createSession(
            validation.data
          );

        return reply.code(201).send({
          data: session,
          error: null
        });
      }
    );
  };
