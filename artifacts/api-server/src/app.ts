import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Production: only allow requests from chatcart.in (same-origin requests don't
// need CORS headers, so this only affects cross-origin callers).
// Development: permissive so the Replit preview and local dev servers work.
const corsOptions =
  process.env.NODE_ENV === "production"
    ? { origin: ["https://chatcart.in", "https://www.chatcart.in"], credentials: true }
    : { origin: true, credentials: true };

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
