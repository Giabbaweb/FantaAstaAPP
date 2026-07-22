import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text
} from "drizzle-orm/sqlite-core";

export const auctionSessions = sqliteTable("auction_sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  season: text("season").notNull(),
  status: text("status", {
    enum: [
      "DRAFT",
      "READY",
      "RUNNING",
      "SUSPENDED",
      "COMPLETED",
      "ARCHIVED"
    ]
  })
    .notNull()
    .default("DRAFT"),
  initialCredits: integer("initial_credits").notNull().default(330),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

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
