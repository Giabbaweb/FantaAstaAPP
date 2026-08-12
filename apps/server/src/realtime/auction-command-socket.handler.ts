import {
  auctionCommandRequestSchema,
  type AuctionCommandAck
} from "@fantaastaapp/contracts";

import {
  mapAuctionCallError
} from "../http/auction-call-errors.js";
import type {
  AuctionCallService
} from "../services/auction-call.service.js";
import type {
  AuctionCallCommandCoordinator
} from "./auction-call-command-coordinator.js";
import type {
  RealtimeConnectionManager
} from "./realtime-connection-manager.js";

type AuctionCallReaderPort = Pick<
  AuctionCallService,
  "getById"
>;

type AuctionCallCommandCoordinatorPort = Pick<
  AuctionCallCommandCoordinator,
  | "placeBid"
  | "passTurn"
  | "undoPass"
>;

export class AuctionCommandSocketHandler {
  constructor(
    private readonly connectionManager:
      RealtimeConnectionManager,
    private readonly auctionCallReader:
      AuctionCallReaderPort,
    private readonly coordinator:
      AuctionCallCommandCoordinatorPort
  ) {}

  async handle(
    socketId: string,
    payload: unknown
  ): Promise<AuctionCommandAck> {
    const parsedPayload =
      auctionCommandRequestSchema.safeParse(
        payload
      );

    if (!parsedPayload.success) {
      return this.failure(
        "VALIDATION_ERROR",
        "Auction command payload is invalid"
      );
    }

    const connection =
      this.connectionManager.findBySocketId(
        socketId
      );

    if (
      !connection ||
      connection.status !== "REGISTERED"
    ) {
      return this.failure(
        "UNAUTHORIZED",
        "Realtime connection is not registered"
      );
    }

    if (connection.kind !== "TEAM") {
      return this.failure(
        "UNAUTHORIZED",
        "Public display connections cannot execute auction commands"
      );
    }

    if (connection.role !== "OPERATOR") {
      return this.failure(
        "UNAUTHORIZED",
        "Observers cannot execute auction commands"
      );
    }

    const command = parsedPayload.data;

    if (
      command.command === "OPEN" ||
      command.command === "CONFIRM" ||
      command.command === "CANCEL"
    ) {
      return this.failure(
        "COMMAND_NOT_ALLOWED",
        `Command "${command.command}" is not available from a team remote`
      );
    }

    try {
      const aggregate =
        await this.auctionCallReader.getById(
          command.auctionCallId
        );

      if (
        aggregate.call.auctionSessionId !==
          connection.auctionSessionId
      ) {
        return this.failure(
          "UNAUTHORIZED",
          "Auction call does not belong to the registered auction session"
        );
      }

      if (
        command.auctionSessionTeamId !==
          connection.auctionSessionTeamId
      ) {
        return this.failure(
          "UNAUTHORIZED",
          "Auction command cannot be executed for another team"
        );
      }

      const result =
        command.command === "BID"
          ? await this.coordinator.placeBid(
              command.auctionCallId,
              command.metadata,
              command.auctionSessionTeamId,
              command.bid
            )
          : command.command === "PASS"
            ? await this.coordinator.passTurn(
                command.auctionCallId,
                command.metadata,
                command.auctionSessionTeamId
              )
            : await this.coordinator.undoPass(
                command.auctionCallId,
                command.metadata,
                command.auctionSessionTeamId
              );

      return {
        success: true,
        data: {
          stateVersion:
            result.stateVersion,
          idempotentReplay:
            result.idempotentReplay
        },
        error: null
      };
    } catch (error) {
      const mapped =
        mapAuctionCallError(error);

      if (mapped) {
        return {
          success: false,
          data: null,
          error: {
            code:
              mapped.body.error.code,
            message:
              mapped.body.error.message
          }
        };
      }

      return this.failure(
        "INTERNAL_ERROR",
        error instanceof Error
          ? error.message
          : "Auction command failed"
      );
    }
  }

  private failure(
    code: string,
    message: string
  ): AuctionCommandAck {
    return {
      success: false,
      data: null,
      error: {
        code,
        message
      }
    };
  }
}
