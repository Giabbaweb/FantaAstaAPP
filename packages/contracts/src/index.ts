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

export const leagueSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type League = z.infer<
  typeof leagueSchema
>;

export const createLeagueSchema = z.object({
  name: z.string().trim().min(1).max(100)
});

export type CreateLeagueInput = z.infer<
  typeof createLeagueSchema
>;

export const updateLeagueSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional()
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

export type UpdateLeagueInput = z.infer<
  typeof updateLeagueSchema
>;

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

export const setTeamAccessPinSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{4}$/, {
      message: "PIN must contain exactly 4 digits"
    })
});

export type SetTeamAccessPinInput = z.infer<
  typeof setTeamAccessPinSchema
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

export const auctionSessionSuspensionReasonSchema = z.enum([
  "PIZZA_BREAK",
  "TECHNICAL_BREAK",
  "ORGANIZATIONAL_BREAK",
  "NETWORK_ISSUE",
  "RECOVERY_RESTART",
  "OTHER"
]);

export type AuctionSessionSuspensionReason = z.infer<
  typeof auctionSessionSuspensionReasonSchema
>;

export const auctionSessionSchema = z.object({
  id: z.string().min(1),
  leagueId: z.string().min(1),
  season: z.string().min(1),
  editionNumber: z.number().int().positive(),
  status: auctionSessionStatusSchema,
  suspensionReason:
    auctionSessionSuspensionReasonSchema.nullable(),
  initialCredits: z.number().int().nonnegative(),
  maximumInitialRosterEntries:
    z.number().int().min(0).max(24),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

export type AuctionSession = z.infer<typeof auctionSessionSchema>;

export const createAuctionSessionSchema = z.object({
  leagueId: z.string().min(1),
  season: z.string().trim().min(1),
  editionNumber: z.number().int().positive(),
  initialCredits: z.number().int().nonnegative().default(330),
  maximumInitialRosterEntries:
    z.number().int().min(0).max(24).default(11)
});

export type CreateAuctionSessionInput = z.infer<
  typeof createAuctionSessionSchema
>;

export const updateAuctionSessionSchema = z
  .object({
    leagueId: z.string().min(1).optional(),
    season: z.string().trim().min(1).optional(),
    editionNumber: z.number().int().positive().optional(),
    initialCredits: z.number().int().nonnegative().optional(),
    maximumInitialRosterEntries:
      z.number().int().min(0).max(24).optional()
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
  realTeamName:
    z.string().trim().min(1).max(100).nullable(),
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
  realTeamName:
    z.string().trim().min(1).max(100).nullable().optional(),
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
    realTeamName:
      z.string().trim().min(1).max(100).nullable().optional(),
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

export const suspendAuctionSessionCommandSchema =
  realtimeCommandMetadataSchema.extend({
    reason: auctionSessionSuspensionReasonSchema
  });

export type SuspendAuctionSessionCommand =
  z.infer<
    typeof suspendAuctionSessionCommandSchema
  >;

export const resumeAuctionSessionCommandSchema =
  realtimeCommandMetadataSchema;

export type ResumeAuctionSessionCommand =
  z.infer<
    typeof resumeAuctionSessionCommandSchema
  >;

export const reopenAuctionSessionCommandSchema =
  realtimeCommandMetadataSchema;

export type ReopenAuctionSessionCommand =
  z.infer<
    typeof reopenAuctionSessionCommandSchema
  >;

export const manualInitialRosterCommandActorSchema =
  z.object({
    name: z.string().trim().min(1).max(100),
    role: z.enum([
      "ADMINISTRATOR",
      "AUCTIONEER"
    ])
  });

export type ManualInitialRosterCommandActor =
  z.infer<
    typeof manualInitialRosterCommandActorSchema
  >;

export const createManualBackupCommandSchema =
  z.object({
    actor:
      manualInitialRosterCommandActorSchema
  });

export type CreateManualBackupCommand =
  z.infer<
    typeof createManualBackupCommandSchema
  >;

export const deleteRecoveryPointCommandSchema =
  z.object({
    actor: z.object({
      name:
        z.string()
          .trim()
          .min(1)
          .max(100),
      role:
        z.literal("ADMINISTRATOR")
    })
  });

export type DeleteRecoveryPointCommand =
  z.infer<
    typeof deleteRecoveryPointCommandSchema
  >;

export const restoreRecoveryPointCommandSchema =
  z.object({
    actor: z.object({
      name:
        z.string()
          .trim()
          .min(1)
          .max(100),
      role:
        z.literal("ADMINISTRATOR")
    })
  });

export type RestoreRecoveryPointCommand =
  z.infer<
    typeof restoreRecoveryPointCommandSchema
  >;

export const addManualInitialRosterEntryCommandSchema =
  realtimeCommandMetadataSchema.extend({
    auctionSessionTeamId:
      z.string().trim().min(1).max(100),
    playerId:
      z.string().trim().min(1).max(100),
    acquisitionCost:
      z.number().int().positive(),
    contractYear:
      contractYearSchema,
    actor:
      manualInitialRosterCommandActorSchema,
    comment:
      z.string().trim().max(500).nullable().optional()
  });

export type AddManualInitialRosterEntryCommand =
  z.infer<
    typeof addManualInitialRosterEntryCommandSchema
  >;

export const fmsExportGoalkeeperSelectionSchema =
  z.object({
    playerId: z.string().trim().min(1)
  });

export type FmsExportGoalkeeperSelectionInput =
  z.infer<
    typeof fmsExportGoalkeeperSelectionSchema
  >;

export const manualRosterAssignmentReasonSchema =
  z.enum([
    "OPTION_EXERCISED_MANUALLY",
    "OPTION_NO_EXTERNAL_BID",
    "TECHNICAL_CORRECTION",
    "OTHER"
  ]);

export type ManualRosterAssignmentReason =
  z.infer<
    typeof manualRosterAssignmentReasonSchema
  >;

export const addManualRosterAssignmentCommandSchema =
  realtimeCommandMetadataSchema.extend({
    auctionSessionTeamId:
      z.string().trim().min(1).max(100),
    playerId:
      z.string().trim().min(1).max(100),
    acquisitionCost:
      z.number().int().positive(),
    contractYear:
      contractYearSchema,
    manualAssignmentReason:
      manualRosterAssignmentReasonSchema,
    actor:
      manualInitialRosterCommandActorSchema,
    comment:
      z.string().trim().min(1).max(500)
  });

export type AddManualRosterAssignmentCommand =
  z.infer<
    typeof addManualRosterAssignmentCommandSchema
  >;

export const technicalRosterCorrectionCommandSchema =
  realtimeCommandMetadataSchema.extend({
    rosterEntryId:
      z.string().trim().min(1).max(100),
    targetAuctionSessionTeamId:
      z.string().trim().min(1).max(100),
    targetPlayerId:
      z.string().trim().min(1).max(100),
    targetAcquisitionCost:
      z.number().int().positive(),
    targetContractYear:
      contractYearSchema,
    actor:
      manualInitialRosterCommandActorSchema,
    comment:
      z.string().trim().min(1).max(500)
  });

export type TechnicalRosterCorrectionCommand =
  z.infer<
    typeof technicalRosterCorrectionCommandSchema
  >;

export const auctionCommandTypeSchema = z.enum([
  "OPEN",
  "BID",
  "PASS",
  "UNDO_PASS",
  "CONFIRM",
  "CANCEL"
]);

export type AuctionCommandType = z.infer<
  typeof auctionCommandTypeSchema
>;

const auctionCommandBaseSchema = z.object({
  auctionCallId:
    z.string().trim().min(1).max(100),
  metadata:
    realtimeCommandMetadataSchema
});

export const auctionCommandRequestSchema =
  z.discriminatedUnion(
    "command",
    [
      auctionCommandBaseSchema.extend({
        command: z.literal("OPEN"),
        openingBid:
          z.number().int().positive()
      }),

      auctionCommandBaseSchema.extend({
        command: z.literal("BID"),
        auctionSessionTeamId:
          z.string().trim().min(1).max(100),
        bid:
          z.number().int().positive()
      }),

      auctionCommandBaseSchema.extend({
        command: z.literal("PASS"),
        auctionSessionTeamId:
          z.string().trim().min(1).max(100)
      }),

      auctionCommandBaseSchema.extend({
        command: z.literal("UNDO_PASS"),
        auctionSessionTeamId:
          z.string().trim().min(1).max(100)
      }),

      auctionCommandBaseSchema.extend({
        command: z.literal("CONFIRM")
      }),

      auctionCommandBaseSchema.extend({
        command: z.literal("CANCEL")
      })
    ]
  );

export type AuctionCommandRequest = z.infer<
  typeof auctionCommandRequestSchema
>;

const auctionCommandAckDataSchema = z.object({
  stateVersion:
    z.number().int().nonnegative(),
  idempotentReplay:
    z.boolean()
});

const auctionCommandAckErrorSchema = z.object({
  code: z.string().trim().min(1),
  message: z.string().trim().min(1)
});

export const auctionCommandAckSchema =
  z.discriminatedUnion(
    "success",
    [
      z.object({
        success: z.literal(true),
        data: auctionCommandAckDataSchema,
        error: z.null()
      }),

      z.object({
        success: z.literal(false),
        data: z.null(),
        error: auctionCommandAckErrorSchema
      })
    ]
  );

export type AuctionCommandAck = z.infer<
  typeof auctionCommandAckSchema
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
  "auction:command",
  "auction:event",
  "auction:snapshot"
]);

export type RealtimeEventName = z.infer<
  typeof realtimeEventNameSchema
>;

export const realtimeRegistrationKindSchema = z.enum([
  "TEAM",
  "PUBLIC_DISPLAY"
]);

export type RealtimeRegistrationKind = z.infer<
  typeof realtimeRegistrationKindSchema
>;

export const realtimeTeamRegistrationRequestSchema =
  z.object({
    kind: z.literal("TEAM"),
    deviceId: z.string().trim().min(1).max(100),
    auctionSessionId:
      z.string().trim().min(1).max(100),
    auctionSessionTeamId:
      z.string().trim().min(1).max(100),
    role: realtimeRoleSchema,
    pin: z.string().regex(/^\d{4,8}$/, {
      message:
        "PIN must contain between 4 and 8 digits"
    })
  });

export const realtimePublicDisplayRegistrationRequestSchema =
  z.object({
    kind: z.literal("PUBLIC_DISPLAY"),
    deviceId: z.string().trim().min(1).max(100),
    auctionSessionId:
      z.string().trim().min(1).max(100)
  });

export const realtimeRegistrationRequestSchema =
  z.discriminatedUnion("kind", [
    realtimeTeamRegistrationRequestSchema,
    realtimePublicDisplayRegistrationRequestSchema
  ]);

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

export const realtimeTeamRegisteredPayloadSchema =
  z.object({
    kind: z.literal("TEAM"),
    socketId: z.string().min(1),
    deviceId: z.string().min(1),
    auctionSessionId: z.string().min(1),
    auctionSessionTeamId: z.string().min(1),
    role: realtimeRoleSchema,
    connectedAt: z.string().min(1),
    registeredAt: z.string().min(1)
  });

export const realtimePublicDisplayRegisteredPayloadSchema =
  z.object({
    kind: z.literal("PUBLIC_DISPLAY"),
    socketId: z.string().min(1),
    deviceId: z.string().min(1),
    auctionSessionId: z.string().min(1),
    connectedAt: z.string().min(1),
    registeredAt: z.string().min(1)
  });

export const realtimeRegisteredPayloadSchema =
  z.discriminatedUnion("kind", [
    realtimeTeamRegisteredPayloadSchema,
    realtimePublicDisplayRegisteredPayloadSchema
  ]);

export type RealtimeRegisteredPayload = z.infer<
  typeof realtimeRegisteredPayloadSchema
>;

export const realtimeAuctionCallEventTypeSchema = z.enum([
  "AUCTION_CALL_OPENED",
  "BID_PLACED",
  "TEAM_PASSED",
  "TEAM_PASS_UNDONE",
  "AUCTION_CALL_CONFIRMED",
  "AUCTION_CALL_CANCELLED"
]);

export type RealtimeAuctionCallEventType = z.infer<
  typeof realtimeAuctionCallEventTypeSchema
>;

export const realtimeAuctionSessionEventTypeSchema = z.enum([
  "SESSION_SUSPENDED",
  "SESSION_RESUMED",
  "SESSION_REOPENED"
]);

export type RealtimeAuctionSessionEventType = z.infer<
  typeof realtimeAuctionSessionEventTypeSchema
>;

export const realtimeAuctionEventTypeSchema = z.union([
  realtimeAuctionCallEventTypeSchema,
  realtimeAuctionSessionEventTypeSchema
]);

export type RealtimeAuctionEventType = z.infer<
  typeof realtimeAuctionEventTypeSchema
>;

const realtimeAuctionEventCommonSchema = z.object({
  auctionSessionId: z.string().trim().min(1),
  occurredAt: z.string().min(1),
  payload: z.record(
    z.string(),
    z.unknown()
  )
});

export const realtimeAuctionCallEventSchema =
  realtimeAuctionEventCommonSchema.extend({
    type: realtimeAuctionCallEventTypeSchema,
    auctionCallId: z.string().trim().min(1)
  });

export type RealtimeAuctionCallEvent = z.infer<
  typeof realtimeAuctionCallEventSchema
>;

export const realtimeAuctionSessionSuspendedEventSchema =
  realtimeAuctionEventCommonSchema.extend({
    type: z.literal("SESSION_SUSPENDED"),
    auctionCallId: z.null()
  });

export const realtimeAuctionSessionResumedEventSchema =
  realtimeAuctionEventCommonSchema.extend({
    type: z.literal("SESSION_RESUMED"),
    auctionCallId: z.null()
  });

export const realtimeAuctionSessionReopenedEventSchema =
  realtimeAuctionEventCommonSchema.extend({
    type: z.literal("SESSION_REOPENED"),
    auctionCallId: z.null()
  });

export const realtimeAuctionSessionEventSchema = z.union([
  realtimeAuctionSessionSuspendedEventSchema,
  realtimeAuctionSessionResumedEventSchema,
  realtimeAuctionSessionReopenedEventSchema
]);

export type RealtimeAuctionSessionEvent = z.infer<
  typeof realtimeAuctionSessionEventSchema
>;

export const realtimeAuctionEventSchema = z.union([
  realtimeAuctionCallEventSchema,
  realtimeAuctionSessionSuspendedEventSchema,
  realtimeAuctionSessionResumedEventSchema,
  realtimeAuctionSessionReopenedEventSchema
]);

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

export const realtimePublicDisplayRosterRoleSchema =
  z.object({
    count: z.number().int().nonnegative(),
    limit: z.number().int().positive()
  });

export type RealtimePublicDisplayRosterRole = z.infer<
  typeof realtimePublicDisplayRosterRoleSchema
>;

export const realtimePublicDisplayRosterEntrySchema =
  z.object({
    rosterEntryId: z.string().min(1),
    playerId: z.string().min(1),
    playerName: z.string().min(1),
    realTeamName: z.string().min(1).nullable(),
    role: playerRoleSchema,
    acquisitionCost:
      z.number().int().positive()
  });

export type RealtimePublicDisplayRosterEntry = z.infer<
  typeof realtimePublicDisplayRosterEntrySchema
>;


export const realtimePublicDisplayRosterSchema =
  z.object({
    P: realtimePublicDisplayRosterRoleSchema,
    D: realtimePublicDisplayRosterRoleSchema,
    C: realtimePublicDisplayRosterRoleSchema,
    A: realtimePublicDisplayRosterRoleSchema,
    rosterSize: z.number().int().nonnegative(),
    rosterSizeLimit: z.number().int().positive(),
    remainingRosterSlots:
      z.number().int().nonnegative(),
    entries: z.array(
      realtimePublicDisplayRosterEntrySchema
    )
  });

export type RealtimePublicDisplayRoster = z.infer<
  typeof realtimePublicDisplayRosterSchema
>;


export const realtimePublicDisplayTeamSchema =
  z.object({
    auctionSessionTeamId: z.string().min(1),
    teamId: z.string().min(1),
    teamName: z.string().min(1),
    shortName: z.string().nullable(),
    primaryColor: z.string().nullable(),
    secondaryColor: z.string().nullable(),
    logoPath: z.string().nullable(),
    tableOrder: z.number().int().positive(),
    remainingCredits:
      z.number().int().nonnegative(),
    maximumBid:
      z.number().int().nonnegative().nullable(),
    roster: realtimePublicDisplayRosterSchema
  });

export type RealtimePublicDisplayTeam = z.infer<
  typeof realtimePublicDisplayTeamSchema
>;

export const realtimePublicDisplayPlayerSchema =
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    realTeamName: z.string().min(1).nullable(),
    role: playerRoleSchema
  });

export type RealtimePublicDisplayPlayer = z.infer<
  typeof realtimePublicDisplayPlayerSchema
>;

export const realtimePublicDisplayRecentAwardSchema =
  z.object({
    eventId: z.string().min(1),
    playerId: z.string().min(1),
    playerName: z.string().min(1),
    role: playerRoleSchema,
    auctionSessionTeamId: z.string().min(1),
    teamName: z.string().min(1),
    amount: z.number().int().positive(),
    confirmedAt: z.string().min(1)
  });

export type RealtimePublicDisplayRecentAward = z.infer<
  typeof realtimePublicDisplayRecentAwardSchema
>;

export const realtimePublicDisplayLeagueSchema =
z.object({
id: z.string().min(1),
name: z.string().min(1)
});

export type RealtimePublicDisplayLeague = z.infer<
typeof realtimePublicDisplayLeagueSchema
>;

export const realtimePublicDisplayProjectionSchema =
  z.object({
league: realtimePublicDisplayLeagueSchema,
    teams: z.array(
      realtimePublicDisplayTeamSchema
    ),
    currentPlayer:
      realtimePublicDisplayPlayerSchema.nullable(),
    recentAwards: z.array(
      realtimePublicDisplayRecentAwardSchema
    )
  });

export type RealtimePublicDisplayProjection = z.infer<
  typeof realtimePublicDisplayProjectionSchema
>;

export const realtimeAuctionSnapshotSchema = z.object({
  stateVersion: z.number().int().nonnegative(),
  generatedAt: z.string().min(1),
  session: auctionSessionSchema,
  sessionTeams: z.array(
    realtimeAuctionSessionTeamSchema
  ),
  operationalAuctionCall:
    realtimeOperationalAuctionCallSchema.nullable(),
  publicDisplay:
    realtimePublicDisplayProjectionSchema
});

export type RealtimeAuctionSnapshot = z.infer<
  typeof realtimeAuctionSnapshotSchema
>;
