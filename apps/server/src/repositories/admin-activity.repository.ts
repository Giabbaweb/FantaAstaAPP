import {
  adminActivityItemSchema
} from "@fantaastaapp/contracts";
import type {
  AdminActivityItem
} from "@fantaastaapp/contracts";

import {
  sqlite
} from "../db/client.js";

type AdminActivityRow = {
  event_id: string;
  event_type: AdminActivityItem["eventType"];
  created_at: string;

  player_name: string | null;
  team_name: string | null;
  amount: number | null;

  actor_name: string | null;
  actor_role: AdminActivityItem["actorRole"];
  comment: string | null;

  manual_assignment_reason:
    AdminActivityItem["manualAssignmentReason"];

  suspension_reason:
    AdminActivityItem["suspensionReason"];

  before_team_name: string | null;
  before_player_name: string | null;
  before_amount: number | null;
  before_contract_year: number | null;

  after_team_name: string | null;
  after_player_name: string | null;
  after_amount: number | null;
  after_contract_year: number | null;
};

export interface AdminActivityRepository {
  listRecentByAuctionSessionId(
    auctionSessionId: string,
    limit?: number
  ): Promise<AdminActivityItem[]>;
}

export class SqliteAdminActivityRepository
  implements AdminActivityRepository
{
  async listRecentByAuctionSessionId(
    auctionSessionId: string,
    limit = 20
  ): Promise<AdminActivityItem[]> {
    const safeLimit =
      Math.max(
        1,
        Math.min(
          Math.trunc(limit),
          100
        )
      );

    const rows =
      sqlite.prepare(`
        SELECT
          ae.id AS event_id,
          ae.event_type AS event_type,
          ae.created_at AS created_at,

          p.name AS player_name,
          t.name AS team_name,
          ae.amount AS amount,

          ae.actor_name AS actor_name,
          ae.actor_role AS actor_role,
          ae.comment AS comment,

          ae.manual_assignment_reason
            AS manual_assignment_reason,

          ae.suspension_reason
            AS suspension_reason,

          before_t.name
            AS before_team_name,

          before_p.name
            AS before_player_name,

          ae.before_amount
            AS before_amount,

          ae.before_contract_year
            AS before_contract_year,

          after_t.name
            AS after_team_name,

          after_p.name
            AS after_player_name,

          ae.after_amount
            AS after_amount,

          ae.after_contract_year
            AS after_contract_year

        FROM auction_events ae

        LEFT JOIN players p
          ON p.id = ae.player_id

        LEFT JOIN auction_session_teams ast
          ON ast.id =
            ae.auction_session_team_id

        LEFT JOIN teams t
          ON t.id = ast.team_id

        LEFT JOIN auction_session_teams before_ast
          ON before_ast.id =
            ae.before_auction_session_team_id

        LEFT JOIN teams before_t
          ON before_t.id =
            before_ast.team_id

        LEFT JOIN players before_p
          ON before_p.id =
            ae.before_player_id

        LEFT JOIN auction_session_teams after_ast
          ON after_ast.id =
            ae.after_auction_session_team_id

        LEFT JOIN teams after_t
          ON after_t.id =
            after_ast.team_id

        LEFT JOIN players after_p
          ON after_p.id =
            ae.after_player_id

        WHERE ae.auction_session_id = ?

        ORDER BY
          ae.created_at DESC,
          ae.id DESC

        LIMIT ?
      `).all(
        auctionSessionId,
        safeLimit
      ) as AdminActivityRow[];

    return rows.map((row) =>
      adminActivityItemSchema.parse({
        eventId:
          row.event_id,

        eventType:
          row.event_type,

        createdAt:
          row.created_at,

        playerName:
          row.player_name,

        teamName:
          row.team_name,

        amount:
          row.amount,

        actorName:
          row.actor_name,

        actorRole:
          row.actor_role,

        comment:
          row.comment,

        manualAssignmentReason:
          row.manual_assignment_reason,

        suspensionReason:
          row.suspension_reason,

        beforeTeamName:
          row.before_team_name,

        beforePlayerName:
          row.before_player_name,

        beforeAmount:
          row.before_amount,

        beforeContractYear:
          row.before_contract_year,

        afterTeamName:
          row.after_team_name,

        afterPlayerName:
          row.after_player_name,

        afterAmount:
          row.after_amount,

        afterContractYear:
          row.after_contract_year
      })
    );
  }
}
