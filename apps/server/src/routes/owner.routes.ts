import {
  createOwnerSchema,
  updateOwnerSchema
} from "@fantaastaapp/contracts";
import type {
  CreateOwnerInput,
  Owner,
  UpdateOwnerInput
} from "@fantaastaapp/contracts";
import type {
  FastifyPluginAsync
} from "fastify";

import {
  mapOwnerError
} from "../http/owner-errors.js";
import type {
  OwnerNotFoundResponse
} from "../http/owner-errors.js";
import {
  SqliteOwnerRepository
} from "../repositories/owner.repository.js";
import {
  OwnerService
} from "../services/owner.service.js";

type OwnerParams = {
  id: string;
};

type OwnerListResponse = {
  data: Owner[];
  error: null;
};

type OwnerDetailResponse = {
  data: Owner;
  error: null;
};

type CreateOwnerResponse = {
  data: Owner;
  error: null;
};

type UpdateOwnerResponse = {
  data: Owner;
  error: null;
};

type InvalidRequestResponse = {
  data: null;
  error: {
    code: "INVALID_REQUEST";
    message: string;
  };
};

function formatValidationError(
  issues: {
    message: string;
  }[]
): string {
  return issues
    .map((issue) => issue.message)
    .join("; ");
}

const repository = new SqliteOwnerRepository();
const service = new OwnerService(repository);

export const ownerRoutes: FastifyPluginAsync =
  async (fastify) => {
    fastify.get<{
      Reply: OwnerListResponse;
    }>(
      "/api/owners",
      async (_request, reply) => {
        const owners = await service.listOwners();

        return reply.code(200).send({
          data: owners,
          error: null
        });
      }
    );

    fastify.get<{
      Params: OwnerParams;
      Reply:
        | OwnerDetailResponse
        | OwnerNotFoundResponse;
    }>(
      "/api/owners/:id",
      async (request, reply) => {
        try {
          const owner = await service.getOwnerById(
            request.params.id
          );

          return reply.code(200).send({
            data: owner,
            error: null
          });
        } catch (error) {
          const mapped = mapOwnerError(error);

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
      Body: CreateOwnerInput;
      Reply:
        | CreateOwnerResponse
        | InvalidRequestResponse;
    }>(
      "/api/owners",
      async (request, reply) => {
        const validation =
          createOwnerSchema.safeParse(
            request.body
          );

        if (!validation.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message: formatValidationError(
                validation.error.issues
              )
            }
          });
        }

        const owner = await service.createOwner(
          validation.data
        );

        return reply.code(201).send({
          data: owner,
          error: null
        });
      }
    );

    fastify.patch<{
      Params: OwnerParams;
      Body: UpdateOwnerInput;
      Reply:
        | UpdateOwnerResponse
        | InvalidRequestResponse
        | OwnerNotFoundResponse;
    }>(
      "/api/owners/:id",
      async (request, reply) => {
        const validation =
          updateOwnerSchema.safeParse(
            request.body
          );

        if (!validation.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message: formatValidationError(
                validation.error.issues
              )
            }
          });
        }

        try {
          const owner = await service.updateOwner(
            request.params.id,
            validation.data
          );

          return reply.code(200).send({
            data: owner,
            error: null
          });
        } catch (error) {
          const mapped = mapOwnerError(error);

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
      Params: OwnerParams;
      Reply:
        | void
        | OwnerNotFoundResponse;
    }>(
      "/api/owners/:id",
      async (request, reply) => {
        try {
          await service.deleteOwner(
            request.params.id
          );

          return reply.code(204).send();
        } catch (error) {
          const mapped = mapOwnerError(error);

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
