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
import type {
  InitialRosterImportIssue,
  InitialRosterImportPlanIssue
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
          | InitialRosterImportSuccessResponse
          | InvalidRequestResponse
          | InvalidImportPlanResponse
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
                name: player.name,
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
