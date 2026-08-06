import { sql } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

export const leagues = sqliteTable(
  "leagues",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("leagues_normalized_name_unique").on(table.normalizedName)
  ]
);

export const auctionSessions = sqliteTable(
  "auction_sessions",
  {
    id: text("id").primaryKey(),

    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id, {
        onDelete: "restrict"
      }),

    season: text("season").notNull(),

    editionNumber: integer("edition_number").notNull(),

    status: text("status", {
      enum: [
        "SETUP",
        "READY",
        "RUNNING",
        "SUSPENDED",
        "COMPLETED",
        "CLOSED"
      ]
    })
      .notNull()
      .default("SETUP"),

    initialCredits: integer("initial_credits")
      .notNull()
      .default(330),

    stateVersion: integer("state_version")
      .notNull()
      .default(0),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("auction_sessions_league_season_unique").on(
      table.leagueId,
      table.season
    ),
    uniqueIndex("auction_sessions_league_edition_unique").on(
      table.leagueId,
      table.editionNumber
    ),
    check(
      "auction_sessions_initial_credits_nonnegative",
      sql`${table.initialCredits} >= 0`
    )
  ]
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),

    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id, {
        onDelete: "restrict"
      }),

    name: text("name").notNull(),
    shortName: text("short_name"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    logoPath: text("logo_path"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("teams_league_name_unique").on(
      table.leagueId,
      table.name
    )
  ]
);

export const owners = sqliteTable("owners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const teamOwners = sqliteTable(
  "team_owners",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, {
        onDelete: "cascade"
      }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => owners.id, {
        onDelete: "cascade"
      }),
    isPrimary: integer("is_primary", {
      mode: "boolean"
    })
      .notNull()
      .default(false)
  },
  (table) => [
    primaryKey({
      columns: [table.teamId, table.ownerId]
    })
  ]
);

export const auctionSessionTeams = sqliteTable(
  "auction_session_teams",
  {
    id: text("id").primaryKey(),

    auctionSessionId: text("auction_session_id")
      .notNull()
      .references(() => auctionSessions.id, {
        onDelete: "cascade"
      }),

    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, {
        onDelete: "restrict"
      }),

    tableOrder: integer("table_order").notNull(),

    renewalCredits: integer("renewal_credits")
      .notNull()
      .default(0),

    remainingCredits: integer("remaining_credits").notNull(),

    accessPinHash: text("access_pin_hash")
  },
  (table) => [
    uniqueIndex("auction_session_teams_session_team_unique").on(
      table.auctionSessionId,
      table.teamId
    ),

    uniqueIndex("auction_session_teams_table_order_unique").on(
      table.auctionSessionId,
      table.tableOrder
    ),

    check(
      "auction_session_teams_table_order_range",
      sql`${table.tableOrder} BETWEEN 1 AND 8`
    ),

    check(
      "auction_session_teams_renewal_credits_nonnegative",
      sql`${table.renewalCredits} >= 0`
    ),

    check(
      "auction_session_teams_remaining_credits_nonnegative",
      sql`${table.remainingCredits} >= 0`
    )
  ]
);

export const players = sqliteTable(
  "players",
  {
    id: text("id").primaryKey(),

    auctionSessionId: text("auction_session_id")
      .notNull()
      .references(() => auctionSessions.id, {
        onDelete: "cascade"
      }),

    fmsCode: text("fms_code").notNull(),

    name: text("name").notNull(),

    normalizedName: text("normalized_name").notNull(),

    role: text("role", {
      enum: ["P", "D", "C", "A"]
    }).notNull(),

    availabilityStatus: text("availability_status", {
      enum: ["AVAILABLE", "ROSTERED", "UNAVAILABLE"]
    })
      .notNull()
      .default("AVAILABLE"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("players_session_fms_code_unique").on(
      table.auctionSessionId,
      table.fmsCode
    ),

    uniqueIndex("players_session_normalized_name_unique").on(
      table.auctionSessionId,
      table.normalizedName
    )
  ]
);

export const rosterEntries = sqliteTable(
  "roster_entries",
  {
    id: text("id").primaryKey(),

    auctionSessionTeamId: text("auction_session_team_id")
      .notNull()
      .references(() => auctionSessionTeams.id, {
        onDelete: "cascade"
      }),

    playerId: text("player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "restrict"
      }),

    acquisitionCost: integer("acquisition_cost").notNull(),

    contractYear: integer("contract_year").notNull(),

    source: text("source", {
      enum: [
        "INITIAL_ROSTER",
        "AUCTION",
        "OPTION",
        "MANUAL_ASSIGNMENT",
        "TECHNICAL_CORRECTION"
      ]
    }).notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("roster_entries_player_unique").on(table.playerId),

    check(
      "roster_entries_acquisition_cost_positive",
      sql`${table.acquisitionCost} >= 1`
    ),

    check(
      "roster_entries_contract_year_range",
      sql`${table.contractYear} BETWEEN 1 AND 3`
    )
  ]
);

export const auctionCalls = sqliteTable(
  "auction_calls",
  {
    id: text("id").primaryKey(),

    auctionSessionId: text("auction_session_id")
      .notNull()
      .references(() => auctionSessions.id, {
        onDelete: "cascade"
      }),

    playerId: text("player_id")
      .notNull()
      .references(() => players.id, {
        onDelete: "restrict"
      }),

    callerAuctionSessionTeamId: text(
      "caller_auction_session_team_id"
    )
      .notNull()
      .references(() => auctionSessionTeams.id, {
        onDelete: "restrict"
      }),

    status: text("status", {
      enum: [
        "DRAFT",
        "OPEN",
        "PROVISIONAL_AWARD",
        "SUSPENDED",
        "CONFIRMED",
        "CANCELLED",
        "ROLLED_BACK"
      ]
    })
      .notNull()
      .default("DRAFT"),

    openingBid: integer("opening_bid"),

    currentBid: integer("current_bid"),

    currentLeaderAuctionSessionTeamId: text(
      "current_leader_auction_session_team_id"
    ).references(() => auctionSessionTeams.id, {
      onDelete: "restrict"
    }),

    currentTurnAuctionSessionTeamId: text(
      "current_turn_auction_session_team_id"
    ).references(() => auctionSessionTeams.id, {
      onDelete: "restrict"
    }),

    provisionalWinnerAuctionSessionTeamId: text(
      "provisional_winner_auction_session_team_id"
    ).references(() => auctionSessionTeams.id, {
      onDelete: "restrict"
    }),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    check(
      "auction_calls_opening_bid_positive",
      sql`${table.openingBid} IS NULL OR ${table.openingBid} >= 1`
    ),

    check(
      "auction_calls_current_bid_positive",
      sql`${table.currentBid} IS NULL OR ${table.currentBid} >= 1`
    )
  ]
);

export const auctionCallTeams = sqliteTable(
  "auction_call_teams",
  {
    id: text("id").primaryKey(),

    auctionCallId: text("auction_call_id")
      .notNull()
      .references(() => auctionCalls.id, {
        onDelete: "cascade"
      }),

    auctionSessionTeamId: text(
      "auction_session_team_id"
    )
      .notNull()
      .references(() => auctionSessionTeams.id, {
        onDelete: "restrict"
      }),

    status: text("status", {
      enum: [
        "ACTIVE",
        "PASSED",
        "EXCLUDED"
      ]
    })
      .notNull()
      .default("ACTIVE"),

    maximumBid: integer("maximum_bid").notNull(),

    exclusionReason: text("exclusion_reason", {
      enum: [
        "MAXIMUM_BID_TOO_LOW",
        "ROSTER_FULL",
        "ROLE_LIMIT_REACHED"
      ]
    }),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex(
      "auction_call_teams_call_team_unique"
    ).on(
      table.auctionCallId,
      table.auctionSessionTeamId
    ),

    check(
      "auction_call_teams_maximum_bid_nonnegative",
      sql`${table.maximumBid} >= 0`
    )
  ]
);

export const commandRegistry = sqliteTable(
  "command_registry",
  {
    id: text("id").primaryKey(),

    auctionSessionId: text("auction_session_id")
      .notNull()
      .references(() => auctionSessions.id, {
        onDelete: "cascade"
      }),

    auctionCallId: text("auction_call_id")
      .notNull()
      .references(() => auctionCalls.id, {
        onDelete: "cascade"
      }),

    commandId: text("command_id").notNull(),

    commandType: text("command_type", {
      enum: [
        "OPEN",
        "BID",
        "PASS",
        "UNDO_PASS",
        "CONFIRM",
        "CANCEL"
      ]
    }).notNull(),

    expectedStateVersion: integer(
      "expected_state_version"
    ).notNull(),

    resultStateVersion: integer(
      "result_state_version"
    ).notNull(),

    requestFingerprint: text(
      "request_fingerprint"
    ).notNull(),

    resultPayload: text(
      "result_payload"
    ).notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex(
      "command_registry_session_command_unique"
    ).on(
      table.auctionSessionId,
      table.commandId
    ),

    check(
      "command_registry_expected_version_nonnegative",
      sql`${table.expectedStateVersion} >= 0`
    ),

    check(
      "command_registry_result_version_positive",
      sql`${table.resultStateVersion} >= 1`
    ),

    check(
      "command_registry_version_progression",
      sql`${table.resultStateVersion} = ${table.expectedStateVersion} + 1`
    )
  ]
);
