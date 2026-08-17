import type {
  FastifyPluginAsync
} from "fastify";

import type {
  RecoveryPointCatalogService
} from "../services/recovery-point-catalog.service.js";

type RecoveryPointCatalogParams = {
  id: string;
};

type RecoveryPointCatalogPort = Pick<
  RecoveryPointCatalogService,
  "listForAuctionSession"
>;

export function recoveryPointCatalogRoutes(
  catalogService:
    RecoveryPointCatalogPort
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.get<{
      Params: RecoveryPointCatalogParams;
    }>(
      "/api/auction-sessions/:id/backups",
      async (request, reply) => {
        try {
          const recoveryPoints =
            await catalogService
              .listForAuctionSession(
                request.params.id
              );

          return reply.code(200).send({
            data: recoveryPoints,
            error: null
          });
        } catch (error) {
          fastify.log.error(
            {
              module: "backup",
              auctionSessionId:
                request.params.id,
              error
            },
            "Recovery point catalog read failed"
          );

          return reply.code(500).send({
            data: null,
            error: {
              code:
                "RECOVERY_POINT_CATALOG_FAILED",
              message:
                "Recovery point catalog could not be read"
            }
          });
        }
      }
    );
  };
}
