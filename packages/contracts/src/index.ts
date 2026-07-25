import { z } from "zod";

export type HealthStatus = {
  status: "ok";
  application: "FantaAstaAPP";
  timestamp: string;
};

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
