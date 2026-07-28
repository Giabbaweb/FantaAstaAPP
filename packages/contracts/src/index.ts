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
