import { sql } from "drizzle-orm";
import {
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
    )
  ]
);

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  auctionSessionId: text("auction_session_id")
    .notNull()
    .references(() => auctionSessions.id, {
      onDelete: "cascade"
    }),
  name: text("name").notNull(),
  shortName: text("short_name"),
  initialCredits: integer("initial_credits").notNull().default(330),
  renewalCredits: integer("renewal_credits").notNull().default(0),
  remainingCredits: integer("remaining_credits").notNull().default(330),
  tableOrder: integer("table_order").notNull(),
  isActive: integer("is_active", {
    mode: "boolean"
  })
    .notNull()
    .default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const owners = sqliteTable("owners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at")
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
