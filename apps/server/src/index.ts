import "dotenv/config";

import {
  buildApp
} from "./app.js";

const host =
  process.env.HOST ?? "0.0.0.0";

const port =
  Number(process.env.PORT ?? 3001);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(
    `PORT non valida: ${process.env.PORT ?? ""}`
  );
}

const app =
  await buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({
      host,
      port
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();
