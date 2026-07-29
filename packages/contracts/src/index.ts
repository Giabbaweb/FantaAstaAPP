import { z } from "zod";

export type HealthStatus = {
  status: "ok";
  application: "FantaAstaAPP";
  timestamp: string;
};

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, {
    message: "Color must use the #RRGGBB format"
  });

const nullableOptionalStringSchema = (
  schema: z.ZodString
) => schema.nullable().optional();

export const teamSchema = z.object({
  id: z.string().min(1),
  leagueId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  shortName: z.string().trim().min(1).max(20).nullable(),
  primaryColor: hexColorSchema.nullable(),
  secondaryColor: hexColorSchema.nullable(),
  logoPath: z.string().trim().min(1).max(500).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type Team = z.infer<typeof teamSchema>;

export const createTeamSchema = z.object({
  leagueId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  shortName: nullableOptionalStringSchema(
    z.string().trim().min(1).max(20)
  ),
  primaryColor: hexColorSchema.nullable().optional(),
  secondaryColor: hexColorSchema.nullable().optional(),
  logoPath: nullableOptionalStringSchema(
    z.string().trim().min(1).max(500)
  )
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    shortName: nullableOptionalStringSchema(
      z.string().trim().min(1).max(20)
    ),
    primaryColor: hexColorSchema.nullable().optional(),
    secondaryColor: hexColorSchema.nullable().optional(),
    logoPath: nullableOptionalStringSchema(
      z.string().trim().min(1).max(500)
    )
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "At least one field must be provided"
    }
  );

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const ownerSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type Owner = z.infer<typeof ownerSchema>;

export const createOwnerSchema = z.object({
  name: z.string().trim().min(1).max(100)
});

export type CreateOwnerInput = z.infer<
  typeof createOwnerSchema
>;

export const updateOwnerSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional()
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "At least one field must be provided"
    }
  );

export type UpdateOwnerInput = z.infer<
  typeof updateOwnerSchema
>;

export const teamOwnerSchema = z.object({
  teamId: z.string().min(1),
  ownerId: z.string().min(1),
  isPrimary: z.boolean()
});

export type TeamOwner = z.infer<typeof teamOwnerSchema>;

export const createTeamOwnerSchema = z.object({
  ownerId: z.string().min(1),
  isPrimary: z.boolean().default(false)
});

export type CreateTeamOwnerInput = z.infer<
  typeof createTeamOwnerSchema
>;

export const updateTeamOwnerSchema = z.object({
  isPrimary: z.boolean()
});

export type UpdateTeamOwnerInput = z.infer<
  typeof updateTeamOwnerSchema
>;

export const auctionSessionTeamSchema = z.object({
  auctionSessionId: z.string().min(1),
  teamId: z.string().min(1),
  tableOrder: z.number().int().positive(),
  renewalCredits: z.number().int().nonnegative(),
  remainingCredits: z.number().int().nonnegative()
});

export type AuctionSessionTeam = z.infer<
  typeof auctionSessionTeamSchema
>;

export const createAuctionSessionTeamSchema = z.object({
  teamId: z.string().min(1),
  tableOrder: z.number().int().positive(),
  renewalCredits: z.number().int().nonnegative().default(0),
  remainingCredits: z.number().int().nonnegative()
});

export type CreateAuctionSessionTeamInput = z.infer<
  typeof createAuctionSessionTeamSchema
>;

export const updateAuctionSessionTeamSchema = z
  .object({
    tableOrder: z.number().int().positive().optional(),
    renewalCredits: z.number().int().nonnegative().optional(),
    remainingCredits: z.number().int().nonnegative().optional()
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "At least one field must be provided"
    }
  );

export type UpdateAuctionSessionTeamInput = z.infer<
  typeof updateAuctionSessionTeamSchema
>;

export const auctionSessionStatusSchema = z.enum([
  "SETUP",
  "READY",
  "RUNNING",
  "SUSPENDED",
  "COMPLETED",
  "CLOSED"
]);

export type AuctionSessionStatus = z.infer<
  typeof auctionSessionStatusSchema
>;

export const auctionSessionSchema = z.object({
  id: z.string().min(1),
  leagueId: z.string().min(1),
  season: z.string().min(1),
  editionNumber: z.number().int().positive(),
  status: auctionSessionStatusSchema,
  initialCredits: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type AuctionSession = z.infer<typeof auctionSessionSchema>;

export const createAuctionSessionSchema = z.object({
  leagueId: z.string().min(1),
  season: z.string().trim().min(1),
  editionNumber: z.number().int().positive(),
  initialCredits: z.number().int().nonnegative().default(330)
});

export type CreateAuctionSessionInput = z.infer<
  typeof createAuctionSessionSchema
>;

export const updateAuctionSessionSchema = z
  .object({
    leagueId: z.string().min(1).optional(),
    season: z.string().trim().min(1).optional(),
    editionNumber: z.number().int().positive().optional(),
    initialCredits: z.number().int().nonnegative().optional()
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "At least one field must be provided"
    }
  );

export type UpdateAuctionSessionInput = z.infer<
  typeof updateAuctionSessionSchema
>;

export const updateAuctionSessionStatusSchema = z.object({
  status: auctionSessionStatusSchema
});

export type UpdateAuctionSessionStatusInput = z.infer<
  typeof updateAuctionSessionStatusSchema
>;

export const playerRoleSchema = z.enum([
  "P",
  "D",
  "C",
  "A"
]);

export type PlayerRole = z.infer<
  typeof playerRoleSchema
>;

export const playerAvailabilityStatusSchema = z.enum([
  "AVAILABLE",
  "ROSTERED",
  "UNAVAILABLE"
]);

export type PlayerAvailabilityStatus = z.infer<
  typeof playerAvailabilityStatusSchema
>;

export const playerSchema = z.object({
  id: z.string().min(1),
  auctionSessionId: z.string().min(1),
  fmsCode: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(150),
  normalizedName: z.string().min(1),
  role: playerRoleSchema,
  availabilityStatus: playerAvailabilityStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type Player = z.infer<
  typeof playerSchema
>;

export const createPlayerSchema = z.object({
  auctionSessionId: z.string().min(1),
  fmsCode: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(150),
  role: playerRoleSchema,
  availabilityStatus: playerAvailabilityStatusSchema
    .default("AVAILABLE")
});

export type CreatePlayerInput = z.infer<
  typeof createPlayerSchema
>;

export const updatePlayerSchema = z
  .object({
    fmsCode: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(1).max(150).optional(),
    role: playerRoleSchema.optional(),
    availabilityStatus:
      playerAvailabilityStatusSchema.optional()
  })
  .refine(
    (value) =>
      Object.values(value).some(
        (field) => field !== undefined
      ),
    {
      message: "At least one field must be provided"
    }
  );

export type UpdatePlayerInput = z.infer<
  typeof updatePlayerSchema
>;

export const rosterEntrySourceSchema = z.enum([
  "INITIAL_ROSTER",
  "AUCTION",
  "OPTION",
  "MANUAL_ASSIGNMENT",
  "TECHNICAL_CORRECTION"
]);

export type RosterEntrySource = z.infer<
  typeof rosterEntrySourceSchema
>;

export const contractYearSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);

export type ContractYear = z.infer<
  typeof contractYearSchema
>;

export const rosterEntrySchema = z.object({
  id: z.string().min(1),
  auctionSessionTeamId: z.string().min(1),
  playerId: z.string().min(1),
  acquisitionCost: z.number().int().positive(),
  contractYear: contractYearSchema,
  source: rosterEntrySourceSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type RosterEntry = z.infer<
  typeof rosterEntrySchema
>;

export const createInitialRosterEntrySchema = z.object({
  auctionSessionTeamId: z.string().min(1),
  playerId: z.string().min(1),
  acquisitionCost: z.number().int().positive(),
  contractYear: contractYearSchema.default(1),
  source: z.literal("INITIAL_ROSTER").default(
    "INITIAL_ROSTER"
  )
});

export type CreateInitialRosterEntryInput = z.infer<
  typeof createInitialRosterEntrySchema
>;
