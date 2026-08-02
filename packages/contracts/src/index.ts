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

export const realtimeRoleSchema = z.enum([
  "OPERATOR",
  "OBSERVER"
]);

export type RealtimeRole = z.infer<
  typeof realtimeRoleSchema
>;

export const realtimeConnectionStatusSchema = z.enum([
  "UNREGISTERED",
  "REGISTERED",
  "DISCONNECTED"
]);

export type RealtimeConnectionStatus = z.infer<
  typeof realtimeConnectionStatusSchema
>;

export const realtimeCommandMetadataSchema = z.object({
  commandId: z.string().trim().min(1).max(100),
  stateVersion: z.number().int().nonnegative()
});

export type RealtimeCommandMetadata = z.infer<
  typeof realtimeCommandMetadataSchema
>;

export const realtimeErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "OPERATOR_ALREADY_CONNECTED",
  "INTERNAL_ERROR"
]);

export type RealtimeErrorCode = z.infer<
  typeof realtimeErrorCodeSchema
>;

export const realtimeErrorSchema = z.object({
  code: realtimeErrorCodeSchema,
  message: z.string().trim().min(1),
  details: z.record(
    z.string(),
    z.unknown()
  ).optional()
});

export type RealtimeError = z.infer<
  typeof realtimeErrorSchema
>;

export const realtimeEventNameSchema = z.enum([
  "realtime:connected",
  "realtime:register",
  "realtime:registered",
  "realtime:error",
  "auction:event",
  "auction:snapshot"
]);

export type RealtimeEventName = z.infer<
  typeof realtimeEventNameSchema
>;

export const realtimeRegistrationRequestSchema = z.object({
  deviceId: z.string().trim().min(1).max(100),
  auctionSessionId: z.string().trim().min(1).max(100),
  auctionSessionTeamId: z.string().trim().min(1).max(100),
  role: realtimeRoleSchema,
  pin: z.string().regex(/^\d{4,8}$/, {
    message: "PIN must contain between 4 and 8 digits"
  })
});

export type RealtimeRegistrationRequest = z.infer<
  typeof realtimeRegistrationRequestSchema
>;

export const realtimeConnectedPayloadSchema = z.object({
  socketId: z.string().min(1),
  connectedAt: z.string().min(1)
});

export type RealtimeConnectedPayload = z.infer<
  typeof realtimeConnectedPayloadSchema
>;

export const realtimeRegisteredPayloadSchema = z.object({
  socketId: z.string().min(1),
  deviceId: z.string().min(1),
  auctionSessionId: z.string().min(1),
  auctionSessionTeamId: z.string().min(1),
  role: realtimeRoleSchema,
  connectedAt: z.string().min(1),
  registeredAt: z.string().min(1)
});

export type RealtimeRegisteredPayload = z.infer<
  typeof realtimeRegisteredPayloadSchema
>;

export const realtimeAuctionEventTypeSchema = z.enum([
  "AUCTION_CALL_OPENED",
  "BID_PLACED",
  "TEAM_PASSED",
  "TEAM_PASS_UNDONE",
  "AUCTION_CALL_CONFIRMED",
  "AUCTION_CALL_CANCELLED"
]);

export type RealtimeAuctionEventType = z.infer<
  typeof realtimeAuctionEventTypeSchema
>;

export const realtimeAuctionEventSchema = z.object({
  type: realtimeAuctionEventTypeSchema,
  auctionSessionId: z.string().trim().min(1),
  auctionCallId: z.string().trim().min(1),
  occurredAt: z.string().min(1),
  payload: z.record(
    z.string(),
    z.unknown()
  )
});

export type RealtimeAuctionEvent = z.infer<
  typeof realtimeAuctionEventSchema
>;

export const auctionCallStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "PROVISIONAL_AWARD",
  "SUSPENDED",
  "CONFIRMED",
  "CANCELLED",
  "ROLLED_BACK"
]);

export type AuctionCallStatus = z.infer<
  typeof auctionCallStatusSchema
>;

export const auctionCallSchema = z.object({
  id: z.string().min(1),
  auctionSessionId: z.string().min(1),
  playerId: z.string().min(1),
  callerAuctionSessionTeamId: z.string().min(1),
  status: auctionCallStatusSchema,
  openingBid: z.number().int().positive().nullable(),
  currentBid: z.number().int().positive().nullable(),
  currentLeaderAuctionSessionTeamId:
    z.string().min(1).nullable(),
  currentTurnAuctionSessionTeamId:
    z.string().min(1).nullable(),
  provisionalWinnerAuctionSessionTeamId:
    z.string().min(1).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type AuctionCall = z.infer<
  typeof auctionCallSchema
>;

export const auctionCallTeamStatusSchema = z.enum([
  "ACTIVE",
  "PASSED",
  "EXCLUDED"
]);

export type AuctionCallTeamStatus = z.infer<
  typeof auctionCallTeamStatusSchema
>;

export const auctionCallTeamExclusionReasonSchema =
  z.enum([
    "MAXIMUM_BID_TOO_LOW",
    "ROSTER_FULL",
    "ROLE_LIMIT_REACHED"
  ]);

export type AuctionCallTeamExclusionReason = z.infer<
  typeof auctionCallTeamExclusionReasonSchema
>;

export const auctionCallTeamSchema = z.object({
  auctionCallId: z.string().min(1),
  auctionSessionTeamId: z.string().min(1),
  turnOrder: z.number().int().positive(),
  status: auctionCallTeamStatusSchema,
  maximumBid: z.number().int().nonnegative(),
  exclusionReason:
    auctionCallTeamExclusionReasonSchema.nullable()
});

export type AuctionCallTeam = z.infer<
  typeof auctionCallTeamSchema
>;

export const realtimeAuctionSessionTeamSchema =
  auctionSessionTeamSchema.extend({
    id: z.string().min(1)
  });

export type RealtimeAuctionSessionTeam = z.infer<
  typeof realtimeAuctionSessionTeamSchema
>;

export const realtimeOperationalAuctionCallSchema =
  z.object({
    call: auctionCallSchema,
    teams: z.array(auctionCallTeamSchema)
  });

export type RealtimeOperationalAuctionCall = z.infer<
  typeof realtimeOperationalAuctionCallSchema
>;

export const realtimeAuctionSnapshotSchema = z.object({
  stateVersion: z.number().int().nonnegative(),
  generatedAt: z.string().min(1),
  session: auctionSessionSchema,
  sessionTeams: z.array(
    realtimeAuctionSessionTeamSchema
  ),
  operationalAuctionCall:
    realtimeOperationalAuctionCallSchema.nullable()
});

export type RealtimeAuctionSnapshot = z.infer<
  typeof realtimeAuctionSnapshotSchema
>;
