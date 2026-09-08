import type {
  AdminActivityItem
} from "@fantaastaapp/contracts";

import type {
  FastifyPluginAsync
} from "fastify";

import {
  SqliteAdminActivityRepository
} from "../repositories/admin-activity.repository.js";

type AdminActivityParams = {
  auctionSessionId: string;
};

type AdminActivityQuery = {
  limit?: string;
};

type AdminActivityResponse = {
  data: AdminActivityItem[];
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
  new SqliteAdminActivityRepository();

export const adminActivityRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Params: AdminActivityParams;
        Querystring: AdminActivityQuery;
        Reply:
          | AdminActivityResponse
          | InvalidRequestResponse;
      }>(
        "/api/auction-sessions/:auctionSessionId/activity",
        async (request, reply) => {
          let limit = 20;

          if (
            request.query.limit !== undefined
          ) {
            const parsedLimit =
              Number(
                request.query.limit
              );

            if (
              !Number.isInteger(parsedLimit) ||
              parsedLimit < 1 ||
              parsedLimit > 100
            ) {
              return reply.code(400).send({
                data: null,
                error: {
                  code: "INVALID_REQUEST",
                  message:
                    '"limit" must be an integer between 1 and 100'
                }
              });
            }

            limit = parsedLimit;
          }

          const activity =
            await repository
              .listRecentByAuctionSessionId(
                request.params
                  .auctionSessionId,
                limit
              );

          return reply.code(200).send({
            data: activity,
            error: null
          });
        }
      );
    };
