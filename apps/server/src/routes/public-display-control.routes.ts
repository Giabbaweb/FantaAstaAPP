import {
  publicDisplayControlPatchSchema
} from "@fantaastaapp/contracts";

import type {
  PublicDisplayControlState
} from "@fantaastaapp/contracts";

import type {
  FastifyPluginAsync
} from "fastify";

type Params = {
  auctionSessionId: string;
};

const DEFAULT_STATE:
  PublicDisplayControlState = {
    displayMode: "STANDARD",
    activeView: "AUCTION"
  };

const stateByAuctionSessionId =
  new Map<
    string,
    PublicDisplayControlState
  >();

function getState(
  auctionSessionId: string
): PublicDisplayControlState {
  return (
    stateByAuctionSessionId.get(
      auctionSessionId
    ) ?? DEFAULT_STATE
  );
}

export const publicDisplayControlRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.get<{
        Params: Params;
      }>(
        "/api/auction-sessions/:auctionSessionId/public-display-control",
        async (request, reply) => {
          return reply.code(200).send({
            data: getState(
              request.params.auctionSessionId
            ),
            error: null
          });
        }
      );

      fastify.patch<{
        Params: Params;
      }>(
        "/api/auction-sessions/:auctionSessionId/public-display-control",
        async (request, reply) => {
          const parsed =
            publicDisplayControlPatchSchema
              .safeParse(
                request.body
              );

          if (!parsed.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  "Invalid public display control"
              }
            });
          }

          const current =
            getState(
              request.params
                .auctionSessionId
            );

          const next:
            PublicDisplayControlState = {
              displayMode:
                parsed.data.displayMode ??
                current.displayMode,

              activeView:
                parsed.data.activeView ??
                current.activeView
            };

          stateByAuctionSessionId.set(
            request.params
              .auctionSessionId,
            next
          );

          return reply.code(200).send({
            data: next,
            error: null
          });
        }
      );
    };
