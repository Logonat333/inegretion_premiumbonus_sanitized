import { createServer } from "@interfaces/http/server";
import { loadConfig } from "@infrastructure/config/config";
import { logger } from "@infrastructure/observability/logger";

function bootstrap(): void {
  const config = loadConfig();
  const app = createServer({ config });

  const port = config.http.port;

  app
    .listen(port, () => {
      logger.info({ port }, "HTTP server started");
    })
    .on("error", (error) => {
      logger.error({ err: error }, "HTTP server failed to start");
      process.exitCode = 1;
    });
}

void bootstrap();
