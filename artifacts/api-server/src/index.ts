import app from "./app";
import { logger } from "./lib/logger";
import { initWA, setOnConnectHook } from "./lib/whatsapp.js";
import { startCampaignScheduler, processScheduledMessages } from "./lib/waCampaign.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Fire the campaign scheduler immediately each time WA reconnects
  setOnConnectHook(() => {
    processScheduledMessages().catch((e) => logger.error({ err: e }, "[WA-CAMPAIGN] Post-connect flush error"));
  });
  initWA().catch((e) => logger.error({ err: e }, "[WA] Init error"));
  startCampaignScheduler();
});
