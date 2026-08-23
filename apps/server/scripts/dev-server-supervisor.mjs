import {
  spawn
} from "node:child_process";

const tsxExecutable =
  process.platform === "win32"
    ? "tsx.cmd"
    : "tsx";

let child = null;
let stopping = false;

function startServer() {
  child = spawn(
    tsxExecutable,
    [
      "src/index.ts"
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit"
    }
  );

  child.once(
    "exit",
    (
      code,
      signal
    ) => {
      child = null;

      if (stopping) {
        return;
      }

      if (signal) {
        console.error(
          `[dev-supervisor] server terminated by ${signal}`
        );

        process.exit(1);
      }

      if (code !== 0) {
        console.error(
          `[dev-supervisor] server exited with code ${code ?? 1}`
        );

        process.exit(
          code ?? 1
        );
      }

      console.log(
        "[dev-supervisor] server requested restart"
      );

      startServer();
    }
  );
}

function stop(
  signal
) {
  if (stopping) {
    return;
  }

  stopping = true;

  if (!child) {
    process.exit(0);
  }

  child.once(
    "exit",
    () => {
      process.exit(0);
    }
  );

  child.kill(signal);
}

process.on(
  "SIGINT",
  () => {
    stop("SIGINT");
  }
);

process.on(
  "SIGTERM",
  () => {
    stop("SIGTERM");
  }
);

startServer();
