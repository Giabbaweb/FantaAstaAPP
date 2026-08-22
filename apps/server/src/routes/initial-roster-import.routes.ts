import type {
  FastifyPluginAsync
} from "fastify";
import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  auctionSessionTeams,
  teams
} from "../db/schema/index.js";
import {
  FmsRevoRostersParser
} from "../import/fms-revo-rosters.parser.js";
import {
  buildInitialRosterImportPlan
} from "../import/initial-roster-import.planner.js";
import {
  InitialRosterResolutionError,
  resolveInitialRosterImport
} from "../import/initial-roster-import.resolutions.js";
import type {
  InitialRosterImportIssue,
  InitialRosterImportPlanIssue,
  InitialRosterImportResolution
} from "../import/player-import.types.js";
import {
  SqlitePlayerRepository
} from "../repositories/player.repository.js";
import {
  InitialRosterImportService,
  InitialRosterImportServiceError
} from "../services/initial-roster-import.service.js";

type InitialRosterImportBody = {
  auctionSessionId: string;
  content: string;
  resolutions?: InitialRosterImportResolution[];
};

type InitialRosterPreviewIssue =
  InitialRosterImportIssue & {
    teamName?: string;
    playerName?: string;
    role?: string | null;
    realTeamName?: string;
  };

type InitialRosterImportSuccessResponse = {
  data: {
    importedEntries: number;
    totalCost: number;
    summary: {
      parsedRows: number;
      validEntries: number;
      parserIssueCount: number;
      planningIssueCount: number;
    };
  };
  error: null;
};

type InvalidRequestResponse = {
  data: null;
  error: {
    code: "INVALID_REQUEST";
    message: string;
  };
};

type InvalidImportPlanResponse = {
  data: {
    summary: {
      parsedRows: number;
      validEntries: number;
      parserIssueCount: number;
      planningIssueCount: number;
    };
    parserIssues: InitialRosterImportIssue[];
    planningIssues: InitialRosterImportPlanIssue[];
  };
  error: {
    code: "INVALID_IMPORT_PLAN";
    message: string;
  };
};

type InvalidResolutionResponse = {
  data: null;
  error: {
    code:
      | "INVALID_RESOLUTIONS"
      | "DUPLICATE_RESOLUTION"
      | "ROW_NOT_FOUND"
      | "INVALID_RESOLUTION_TARGET";
    message: string;
  };
};

type InitialRosterImportConflictResponse = {
  data: null;
  error: {
    code:
      | "INSUFFICIENT_CREDITS"
      | "IMPORT_FAILED";
    message: string;
  };
};

const parser = new FmsRevoRostersParser();

const playerRepository =
  new SqlitePlayerRepository();

const importService =
  new InitialRosterImportService();

export const initialRosterImportRoutes:
  FastifyPluginAsync =
    async (fastify) => {
      fastify.post<{
        Body: InitialRosterImportBody;
        Reply:
          | InvalidRequestResponse
          | InvalidImportPlanResponse
          | {
              data: {
                summary: {
                  parsedRows: number;
                  validEntries: number;
                  parserIssueCount: number;
                  planningIssueCount: number;
                };
                parserIssues:
                  InitialRosterPreviewIssue[];
                planningIssues:
                  InitialRosterImportPlanIssue[];
              };
              error: null;
            };
      }>(
        "/api/player-import/initial-rosters/preview",
        async (request, reply) => {
          const body = request.body;

          if (
            !body ||
            typeof body.auctionSessionId !==
              "string" ||
            !body.auctionSessionId.trim()
          ) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  'Body field "auctionSessionId" is required'
              }
            });
          }

          if (
            typeof body.content !== "string" ||
            !body.content.trim()
          ) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  'Body field "content" is required'
              }
            });
          }

          const auctionSessionId =
            body.auctionSessionId.trim();

          const parseResult = parser.parse({
            format: "FMS_REVO_ROSTERS_TAB",
            auctionSessionId,
            content: body.content
          });

          const sessionPlayers =
            await playerRepository
              .findAllByAuctionSessionId(
                auctionSessionId
              );

          const sessionTeams = await db
            .select({
              auctionSessionTeamId:
                auctionSessionTeams.id,
              teamName: teams.name
            })
            .from(auctionSessionTeams)
            .innerJoin(
              teams,
              eq(
                auctionSessionTeams.teamId,
                teams.id
              )
            )
            .where(
              eq(
                auctionSessionTeams
                  .auctionSessionId,
                auctionSessionId
              )
            );

          const plan =
            buildInitialRosterImportPlan(
              parseResult,
              sessionPlayers.map((player) => ({
                id: player.id,
                fmsCode: player.fmsCode,
                name: player.name,
                realTeamName:
                  player.realTeamName,
                role: player.role
              })),
              sessionTeams
            );

          const previewParserIssues =
            plan.parserIssues.map(
              (issue) => {
                const row =
                  parseResult.rows.find(
                    (candidate) =>
                      candidate.rowNumber ===
                      issue.rowNumber
                  );

                return {
                  ...issue,
                  ...(row
                    ? {
                        teamName:
                          row.teamName,
                        playerName:
                          row.playerName,
                        role:
                          row.role,
                        realTeamName:
                          row.realTeamName
                      }
                    : {})
                };
              }
            );

          return reply.code(200).send({
            data: {
              summary: plan.summary,
              parserIssues:
                previewParserIssues,
              planningIssues:
                plan.planningIssues
            },
            error: null
          });
        }
      );

      fastify.post<{
        Body: InitialRosterImportBody;
        Reply:
          | InitialRosterImportSuccessResponse
          | InvalidRequestResponse
          | InvalidImportPlanResponse
          | InvalidResolutionResponse
          | InitialRosterImportConflictResponse;
      }>(
        "/api/player-import/initial-rosters",
        async (request, reply) => {
          const body = request.body;

          if (
            !body ||
            typeof body.auctionSessionId !==
              "string" ||
            !body.auctionSessionId.trim()
          ) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  'Body field "auctionSessionId" is required'
              }
            });
          }

          if (
            typeof body.content !== "string" ||
            !body.content.trim()
          ) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_REQUEST",
                message:
                  'Body field "content" is required'
              }
            });
          }

          if (
            body.resolutions !== undefined &&
            !Array.isArray(body.resolutions)
          ) {
            return reply.code(400).send({
              data: null,
              error: {
                code: "INVALID_RESOLUTIONS",
                message:
                  'Body field "resolutions" must be an array'
              }
            });
          }

          const auctionSessionId =
            body.auctionSessionId.trim();

          const parseResult = parser.parse({
            format: "FMS_REVO_ROSTERS_TAB",
            auctionSessionId,
            content: body.content
          });

          const sessionPlayers =
            await playerRepository
              .findAllByAuctionSessionId(
                auctionSessionId
              );

          const sessionTeams = await db
            .select({
              auctionSessionTeamId:
                auctionSessionTeams.id,
              teamName: teams.name
            })
            .from(auctionSessionTeams)
            .innerJoin(
              teams,
              eq(
                auctionSessionTeams.teamId,
                teams.id
              )
            )
            .where(
              eq(
                auctionSessionTeams
                  .auctionSessionId,
                auctionSessionId
              )
            );

          let resolvedParseResult =
            parseResult;

          try {
            const resolved =
              resolveInitialRosterImport(
                parseResult,
                body.resolutions ?? []
              );

            resolvedParseResult =
              resolved.parseResult;
          } catch (error) {
            if (
              error instanceof
              InitialRosterResolutionError
            ) {
              return reply.code(400).send({
                data: null,
                error: {
                  code: error.code,
                  message: error.message
                }
              });
            }

            throw error;
          }

          const plan =
            buildInitialRosterImportPlan(
              resolvedParseResult,
              sessionPlayers.map((player) => ({
                id: player.id,
                fmsCode: player.fmsCode,
                name: player.name,
                realTeamName:
                  player.realTeamName,
                role: player.role
              })),
              sessionTeams
            );

          if (
            plan.parserIssues.length > 0 ||
            plan.planningIssues.length > 0
          ) {
            return reply.code(400).send({
              data: {
                summary: plan.summary,
                parserIssues:
                  plan.parserIssues,
                planningIssues:
                  plan.planningIssues
              },
              error: {
                code: "INVALID_IMPORT_PLAN",
                message:
                  "Initial roster import plan contains unresolved issues"
              }
            });
          }

          try {
            const result =
              await importService.execute(plan);

            return reply.code(201).send({
              data: {
                importedEntries:
                  result.importedEntries,
                totalCost: result.totalCost,
                summary: plan.summary
              },
              error: null
            });
          } catch (error) {
            if (
              error instanceof
              InitialRosterImportServiceError
            ) {
              if (
                error.code ===
                "INVALID_IMPORT_PLAN"
              ) {
                return reply.code(400).send({
                  data: {
                    summary: plan.summary,
                    parserIssues:
                      plan.parserIssues,
                    planningIssues:
                      plan.planningIssues
                  },
                  error: {
                    code:
                      "INVALID_IMPORT_PLAN",
                    message: error.message
                  }
                });
              }

              return reply.code(409).send({
                data: null,
                error: {
                  code: error.code,
                  message: error.message
                }
              });
            }

            throw error;
          }
        }
      );
    };
