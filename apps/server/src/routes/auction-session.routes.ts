import {
  createAuctionSessionSchema,
  updateAuctionSessionSchema
} from "@fantaastaapp/contracts";
import type {
  AuctionSession,
  CreateAuctionSessionInput,
  UpdateAuctionSessionInput
} from "@fantaastaapp/contracts";
import {
  auctionSessionCommands
} from "@fantaastaapp/domain";
import type {
  AuctionSessionCommand
} from "@fantaastaapp/domain";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapAuctionSessionCreationError,
  mapAuctionSessionError
} from "../http/auction-session-errors.js";
import type {
  AuctionSessionConflictResponse,
  AuctionSessionCreationConflictResponse,
  AuctionSessionNotFoundResponse
} from "../http/auction-session-errors.js";
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

type AuctionSessionDetailResponse = {
  data: AuctionSession;
  error: null;
};

type ActiveAuctionSessionResponse = {
  data: AuctionSession | null;
  error: null;
};

type AuctionSessionParams = {
  id: string;
};

type AuctionSessionCommandParams = {
  id: string;
  command: string;
};

type CreateAuctionSessionResponse = {
  data: AuctionSession;
  error: null;
};

type UpdateAuctionSessionResponse = {
  data: AuctionSession;
  error: null;
};

type ExecuteAuctionSessionCommandResponse = {
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

function isAuctionSessionCommand(
  value: string
): value is AuctionSessionCommand {
  return (
    auctionSessionCommands as readonly string[]
  ).includes(value);
}

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
  Reply: ActiveAuctionSessionResponse;
}>(
  "/api/auction-sessions/active",
  async (_request, reply) => {
    const session =
      await service.getActiveSession();

    return reply.code(200).send({
      data: session,
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
          const mapped =
            mapAuctionSessionError(error);

          if (mapped?.statusCode === 404) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );

    fastify.post<{
      Body: CreateAuctionSessionInput;
      Reply:
        | CreateAuctionSessionResponse
        | InvalidRequestResponse
        | AuctionSessionCreationConflictResponse;
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

        try {
          const session =
            await service.createSession(
              validation.data
            );

          return reply.code(201).send({
            data: session,
            error: null
          });
        } catch (error) {
          const mapped =
            mapAuctionSessionCreationError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );

    fastify.patch<{
      Params: AuctionSessionParams;
      Body: UpdateAuctionSessionInput;
      Reply:
        | UpdateAuctionSessionResponse
        | InvalidRequestResponse
        | AuctionSessionNotFoundResponse
        | AuctionSessionConflictResponse;
    }>(
      "/api/auction-sessions/:id",
      async (request, reply) => {
        const validation =
          updateAuctionSessionSchema.safeParse(
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

        try {
          const session =
            await service.updateSession(
              request.params.id,
              validation.data
            );

          return reply.code(200).send({
            data: session,
            error: null
          });
        } catch (error) {
          const mapped =
            mapAuctionSessionError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );

    fastify.delete<{
      Params: AuctionSessionParams;
      Reply:
        | void
        | AuctionSessionNotFoundResponse
        | AuctionSessionConflictResponse;
    }>(
      "/api/auction-sessions/:id",
      async (request, reply) => {
        try {
          await service.deleteSession(
            request.params.id
          );

          return reply.code(204).send();
        } catch (error) {
          const mapped =
            mapAuctionSessionError(error);

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
      Params: AuctionSessionCommandParams;
      Reply:
        | ExecuteAuctionSessionCommandResponse
        | InvalidRequestResponse
        | AuctionSessionNotFoundResponse
        | AuctionSessionConflictResponse;
    }>(
      "/api/auction-sessions/:id/commands/:command",
      async (request, reply) => {
        const { id, command } =
          request.params;

        if (!isAuctionSessionCommand(command)) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                `Unknown auction session command "${command}"`
            }
          });
        }

        try {
          const session =
            await service.executeCommand(
              id,
              command
            );

          return reply.code(200).send({
            data: session,
            error: null
          });
        } catch (error) {
          const mapped =
            mapAuctionSessionError(error);

          if (mapped) {
            return reply
              .code(mapped.statusCode)
              .send(mapped.body);
          }

          throw error;
        }
      }
    );
  };
