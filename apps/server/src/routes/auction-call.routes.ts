import type {
  FastifyPluginAsync
} from "fastify";

import {
  realtimeCommandMetadataSchema
} from "@fantaastaapp/contracts";

import {
  mapAuctionCallError
} from "../http/auction-call-errors.js";
import type {
  AuctionCallNotFoundResponse
} from "../http/auction-call-errors.js";
import type {
  AuctionCallAggregate
} from "../repositories/auction-call.repository.js";
import {
  AuctionCallCreationService
} from "../services/auction-call-creation.service.js";
import {
  AuctionCallService
} from "../services/auction-call.service.js";
import {
  AuctionCallCommandCoordinator
} from "../realtime/auction-call-command-coordinator.js";

type AuctionCallParams = {
  id: string;
};

type AuctionCallCommandParams = {
  id: string;
  command: string;
};

type AuctionCallCommandBody = {
  commandId?: unknown;
  stateVersion?: unknown;
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

type CreateAuctionCallBody = {
  auctionCallId?: unknown;
  commandId?: unknown;
  stateVersion?: unknown;
  playerFmsCode?: unknown;
  callerAuctionSessionTeamId?: unknown;
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
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

export function auctionCallRoutes(
  service: AuctionCallService,
  commandCoordinator:
    AuctionCallCommandCoordinator,
  creationService:
    AuctionCallCreationService
): FastifyPluginAsync {
  return async (fastify) => {
    fastify.post<{
      Params: AuctionSessionParams;
      Body: CreateAuctionCallBody;
      Reply:
        | AuctionCallCommandResponse
        | InvalidRequestResponse
        | AuctionCallNotFoundResponse;
    }>(
      "/api/auction-sessions/:auctionSessionId/auction-calls",
      async (request, reply) => {
        const body = request.body ?? {};

        const metadataResult =
          realtimeCommandMetadataSchema.safeParse({
            commandId: body.commandId,
            stateVersion: body.stateVersion
          });

        if (!metadataResult.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"commandId" and "stateVersion" are required and must be valid'
            }
          });
        }

        if (
          typeof body.auctionCallId !== "string" ||
          body.auctionCallId.trim().length === 0
        ) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"auctionCallId" must be a non-empty string'
            }
          });
        }

        if (
          typeof body.playerFmsCode !== "string" ||
          body.playerFmsCode.trim().length === 0
        ) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"playerFmsCode" must be a non-empty string'
            }
          });
        }

        if (
          typeof body.callerAuctionSessionTeamId !==
            "string" ||
          body.callerAuctionSessionTeamId.trim().length === 0
        ) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"callerAuctionSessionTeamId" must be a non-empty string'
            }
          });
        }

        try {
          const result =
            await creationService.createDraft({
              auctionSessionId:
                request.params.auctionSessionId,
              auctionCallId:
                body.auctionCallId,
              callerAuctionSessionTeamId:
                body.callerAuctionSessionTeamId,
              playerFmsCode:
                body.playerFmsCode,
              commandId:
                metadataResult.data.commandId,
              expectedStateVersion:
                metadataResult.data.stateVersion
            });

          return reply
            .code(
              result.idempotentReplay
                ? 200
                : 201
            )
            .send({
              data: result.aggregate,
              stateVersion:
                result.stateVersion,
              idempotentReplay:
                result.idempotentReplay,
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

        const metadataResult =
          realtimeCommandMetadataSchema.safeParse({
            commandId: body.commandId,
            stateVersion: body.stateVersion
          });

        if (!metadataResult.success) {
          return reply.code(400).send({
            data: null,
            error: {
              code: "INVALID_REQUEST",
              message:
                '"commandId" and "stateVersion" are required and must be valid'
            }
          });
        }

        const metadata = metadataResult.data;

        try {
          let result;

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

              result = await commandCoordinator.open(
                id,
                metadata,
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

              result = await commandCoordinator.placeBid(
                id,
                metadata,
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

              result = await commandCoordinator.passTurn(
                id,
                metadata,
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

              result = await commandCoordinator.undoPass(
                id,
                metadata,
                auctionSessionTeamId
              );

              break;
            }

            case "confirm": {
              result =
                await commandCoordinator.confirmAuctionCall(
                  id,
                  metadata
                );

              break;
            }

            case "cancel": {
              result =
                await commandCoordinator.cancelAuctionCall(
                  id,
                  metadata
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
            data: result.aggregate,
            stateVersion:
              result.stateVersion,
            idempotentReplay:
              result.idempotentReplay,
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
}
