import {
  addManualInitialRosterEntryCommandSchema,
  addManualRosterAssignmentCommandSchema,
  technicalRosterCorrectionCommandSchema,
  createAuctionSessionSchema,
  reopenAuctionSessionCommandSchema,
  resumeAuctionSessionCommandSchema,
  suspendAuctionSessionCommandSchema,
  updateAuctionSessionSchema
} from "@fantaastaapp/contracts";
import type {
  AuctionSession,
  CreateAuctionSessionInput,
  RosterEntry,
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
  mapAuctionSessionError,
  mapAuctionSessionOperationalCommandError
} from "../http/auction-session-errors.js";
import type {
  AuctionSessionConflictResponse,
  AuctionSessionCreationConflictResponse,
  AuctionSessionNotFoundResponse,
  AuctionSessionOperationalCommandErrorResponse
} from "../http/auction-session-errors.js";
import {
  mapManualInitialRosterError
} from "../http/manual-initial-roster-errors.js";
import type {
  ManualInitialRosterErrorMapping
} from "../http/manual-initial-roster-errors.js";
import {
  mapManualRosterAssignmentError
} from "../http/manual-roster-assignment-errors.js";
import type {
  ManualRosterAssignmentErrorMapping
} from "../http/manual-roster-assignment-errors.js";
import {
  mapTechnicalRosterCorrectionError
} from "../http/technical-roster-correction-errors.js";
import type {
  TechnicalRosterCorrectionErrorMapping
} from "../http/technical-roster-correction-errors.js";
import {
  SqliteAuctionSessionRepository
} from "../repositories/auction-session.repository.js";
import type {
  AuctionSessionOperationalCommandCoordinator
} from "../realtime/auction-session-operational-command-coordinator.js";
import type {
  AtomicManualInitialRosterCommandService
} from "../realtime/atomic-manual-initial-roster-command.service.js";
import type {
  AtomicManualRosterAssignmentCommandService
} from "../realtime/atomic-manual-roster-assignment-command.service.js";
import type {
  AtomicTechnicalRosterCorrectionCommandService
} from "../realtime/atomic-technical-roster-correction-command.service.js";
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

type AuctionSessionCommandBody = {
  commandId?: unknown;
  stateVersion?: unknown;
  reason?: unknown;
  auctionSessionTeamId?: unknown;
  playerId?: unknown;
  acquisitionCost?: unknown;
  contractYear?: unknown;
  actor?: unknown;
  comment?: unknown;
  manualAssignmentReason?: unknown;
  rosterEntryId?: unknown;
  targetAuctionSessionTeamId?: unknown;
  targetPlayerId?: unknown;
  targetAcquisitionCost?: unknown;
  targetContractYear?: unknown;
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

type ExecuteOperationalAuctionSessionCommandResponse = {
  data: AuctionSession;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

type ExecuteManualInitialRosterCommandResponse = {
  data: RosterEntry;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

type ExecuteManualRosterAssignmentCommandResponse = {
  data: RosterEntry;
  stateVersion: number;
  idempotentReplay: boolean;
  error: null;
};

type ExecuteTechnicalRosterCorrectionCommandResponse = {
  data: {
    before: unknown;
    after: unknown;
  };
  stateVersion: number;
  idempotentReplay: boolean;
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

type AuctionSessionOperationalCommandPort = Pick<
  AuctionSessionOperationalCommandCoordinator,
  "suspend" | "resume" | "reopen"
>;

type ManualInitialRosterCommandPort = Pick<
  AtomicManualInitialRosterCommandService,
  "add"
>;

type ManualRosterAssignmentCommandPort = Pick<
  AtomicManualRosterAssignmentCommandService,
  "add"
>;

type TechnicalRosterCorrectionCommandPort = Pick<
  AtomicTechnicalRosterCorrectionCommandService,
  "correct"
>;

export function auctionSessionRoutes(
  operationalCommandService:
    AuctionSessionOperationalCommandPort,
  manualInitialRosterCommandService:
    ManualInitialRosterCommandPort,
  manualRosterAssignmentCommandService:
    ManualRosterAssignmentCommandPort,
  technicalRosterCorrectionCommandService:
    TechnicalRosterCorrectionCommandPort
): FastifyPluginAsync {
  return async (fastify) => {
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
      Body: AuctionSessionCommandBody;
      Reply:
        | ExecuteAuctionSessionCommandResponse
        | ExecuteOperationalAuctionSessionCommandResponse
        | InvalidRequestResponse
        | AuctionSessionNotFoundResponse
        | AuctionSessionConflictResponse
        | AuctionSessionOperationalCommandErrorResponse
        | ExecuteManualInitialRosterCommandResponse
        | ManualInitialRosterErrorMapping["body"]
        | ExecuteManualRosterAssignmentCommandResponse
        | ManualRosterAssignmentErrorMapping["body"]
        | ExecuteTechnicalRosterCorrectionCommandResponse
        | TechnicalRosterCorrectionErrorMapping["body"];
    }>(
      "/api/auction-sessions/:id/commands/:command",
      async (request, reply) => {
        const { id, command } =
          request.params;

        const body = request.body ?? {};

        if (command === "suspend") {
          const validation =
            suspendAuctionSessionCommandSchema
              .safeParse(body);

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  '"commandId", "stateVersion" and "reason" are required and must be valid'
              }
            });
          }

          try {
            const result =
              await operationalCommandService.suspend({
                auctionSessionId: id,
                commandId:
                  validation.data.commandId,
                expectedStateVersion:
                  validation.data.stateVersion,
                reason:
                  validation.data.reason
              });

            return reply.code(200).send({
              data: result.session,
              stateVersion:
                result.stateVersion,
              idempotentReplay:
                result.idempotentReplay,
              error: null
            });
          } catch (error) {
            const operationalMapped =
              mapAuctionSessionOperationalCommandError(
                error
              );

            if (operationalMapped) {
              return reply
                .code(
                  operationalMapped.statusCode
                )
                .send(
                  operationalMapped.body
                );
            }

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

        if (command === "resume") {
          const validation =
            resumeAuctionSessionCommandSchema
              .safeParse(body);

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  '"commandId" and "stateVersion" are required and must be valid'
              }
            });
          }

          try {
            const result =
              await operationalCommandService.resume({
                auctionSessionId: id,
                commandId:
                  validation.data.commandId,
                expectedStateVersion:
                  validation.data.stateVersion
              });

            return reply.code(200).send({
              data: result.session,
              stateVersion:
                result.stateVersion,
              idempotentReplay:
                result.idempotentReplay,
              error: null
            });
          } catch (error) {
            const operationalMapped =
              mapAuctionSessionOperationalCommandError(
                error
              );

            if (operationalMapped) {
              return reply
                .code(
                  operationalMapped.statusCode
                )
                .send(
                  operationalMapped.body
                );
            }

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

        if (command === "reopen") {
          const validation =
            reopenAuctionSessionCommandSchema
              .safeParse(body);

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  '"commandId" and "stateVersion" are required and must be valid'
              }
            });
          }

          try {
            const result =
              await operationalCommandService.reopen({
                auctionSessionId: id,
                commandId:
                  validation.data.commandId,
                expectedStateVersion:
                  validation.data.stateVersion
              });

            return reply.code(200).send({
              data: result.session,
              stateVersion:
                result.stateVersion,
              idempotentReplay:
                result.idempotentReplay,
              error: null
            });
          } catch (error) {
            const operationalMapped =
              mapAuctionSessionOperationalCommandError(
                error
              );

            if (operationalMapped) {
              return reply
                .code(
                  operationalMapped.statusCode
                )
                .send(
                  operationalMapped.body
                );
            }

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

        if (
          command ===
            "add-manual-initial-roster-entry"
        ) {
          const validation =
            addManualInitialRosterEntryCommandSchema
              .safeParse(body);

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  "Manual initial roster command payload is invalid"
              }
            });
          }

          try {
            const result =
              await manualInitialRosterCommandService.add(
                {
                  commandId:
                    validation.data.commandId,
                  stateVersion:
                    validation.data.stateVersion
                },
                validation.data.actor,
                {
                  auctionSessionId: id,
                  auctionSessionTeamId:
                    validation.data
                      .auctionSessionTeamId,
                  playerId:
                    validation.data.playerId,
                  acquisitionCost:
                    validation.data
                      .acquisitionCost,
                  contractYear:
                    validation.data.contractYear
                },
                validation.data.comment
              );

            return reply.code(200).send({
              data: result.rosterEntry,
              stateVersion:
                result.stateVersion,
              idempotentReplay:
                result.idempotentReplay,
              error: null
            });
          } catch (error) {
            const mapped =
              mapManualInitialRosterError(
                error
              );

            if (mapped) {
              return reply
                .code(mapped.statusCode)
                .send(mapped.body);
            }

            throw error;
          }
        }

        if (
          command ===
            "add-manual-roster-assignment"
        ) {
          const validation =
            addManualRosterAssignmentCommandSchema
              .safeParse(body);

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  "Manual roster assignment command payload is invalid"
              }
            });
          }

          try {
            const result =
              await manualRosterAssignmentCommandService.add(
                {
                  commandId:
                    validation.data.commandId,
                  stateVersion:
                    validation.data.stateVersion
                },
                validation.data.actor,
                {
                  auctionSessionId: id,
                  auctionSessionTeamId:
                    validation.data
                      .auctionSessionTeamId,
                  playerId:
                    validation.data.playerId,
                  acquisitionCost:
                    validation.data
                      .acquisitionCost,
                  contractYear:
                    validation.data.contractYear
                },
                validation.data
                  .manualAssignmentReason,
                validation.data.comment
              );

            return reply.code(200).send({
              data: result.rosterEntry,
              stateVersion:
                result.stateVersion,
              idempotentReplay:
                result.idempotentReplay,
              error: null
            });
          } catch (error) {
            const mapped =
              mapManualRosterAssignmentError(
                error
              );

            if (mapped) {
              return reply
                .code(mapped.statusCode)
                .send(mapped.body);
            }

            throw error;
          }
        }

        if (
          command ===
            "technical-roster-correction"
        ) {
          const validation =
            technicalRosterCorrectionCommandSchema
              .safeParse(body);

          if (!validation.success) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  "Technical roster correction command payload is invalid"
              }
            });
          }

          try {
            const result =
              await technicalRosterCorrectionCommandService.correct(
                {
                  commandId:
                    validation.data.commandId,
                  stateVersion:
                    validation.data.stateVersion
                },
                validation.data.actor,
                {
                  auctionSessionId: id,
                  rosterEntryId:
                    validation.data.rosterEntryId,
                  auctionSessionTeamId:
                    validation.data
                      .targetAuctionSessionTeamId,
                  playerId:
                    validation.data.targetPlayerId,
                  acquisitionCost:
                    validation.data
                      .targetAcquisitionCost,
                  contractYear:
                    validation.data
                      .targetContractYear
                },
                validation.data.comment
              );

            return reply.code(200).send({
              data: result.correction,
              stateVersion:
                result.stateVersion,
              idempotentReplay:
                result.idempotentReplay,
              error: null
            });
          } catch (error) {
            const mapped =
              mapTechnicalRosterCorrectionError(
                error
              );

            if (mapped) {
              return reply
                .code(mapped.statusCode)
                .send(mapped.body);
            }

            throw error;
          }
        }

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
}
