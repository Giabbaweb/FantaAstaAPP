import type {
  Server as SocketIOServer
} from "socket.io";

import type {
  RealtimeAuctionEvent
} from "@fantaastaapp/contracts";

import type {
  RealtimePublisher
} from "./realtime-publisher.js";
import {
  auctionSessionRoom
} from "./room-name.js";

export class SocketIoRealtimePublisher
  implements RealtimePublisher
{
  constructor(
    private readonly io: SocketIOServer
  ) {}

  async publishAuctionEvent(
    event: RealtimeAuctionEvent
  ): Promise<void> {
    this.io
      .to(
        auctionSessionRoom(
          event.auctionSessionId
        )
      )
      .emit(
        "auction:event",
        event
      );
  }
}
