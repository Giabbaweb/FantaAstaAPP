import {
  networkInterfaces
} from "node:os";

import type {
  FastifyPluginAsync
} from "fastify";

import {
  findLanAddressCandidates
} from "../system/lan-addresses.js";

type LanAddressesResponse = {
  data: Array<{
    interfaceName: string;
    address: string;
  }>;
  error: null;
};

export const systemRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Reply: LanAddressesResponse;
      }>(
        "/api/system/lan-addresses",
        async (_request, reply) => {
          const candidates =
            findLanAddressCandidates(
              networkInterfaces()
            );

          return reply.code(200).send({
            data: candidates,
            error: null
          });
        }
      );
    };
