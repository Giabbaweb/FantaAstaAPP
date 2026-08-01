import type {
  FastifyInstance
} from "fastify";
import {
  Server as SocketIOServer
} from "socket.io";

export function createSocketServer(
  app: FastifyInstance
): SocketIOServer {
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: true
    }
  });

  io.on("connection", (socket) => {
    app.log.info(
      {
        module: "realtime",
        socketId: socket.id
      },
      "Realtime client connected"
    );

    socket.on("disconnect", (reason) => {
      app.log.info(
        {
          module: "realtime",
          socketId: socket.id,
          reason
        },
        "Realtime client disconnected"
      );
    });
  });

  app.addHook("onClose", async () => {
    await io.close();
  });

  return io;
}
