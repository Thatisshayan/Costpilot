import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

import { requireAuth } from "./middlewares/auth";
import { errorHandler } from "./middlewares/errors";

const app: Express = express();

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
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Apply Authentication middleware to all API routes
app.use("/api", requireAuth, router);

// Load global error handler (Must be placed AFTER all routing layers)
app.use(errorHandler);

export default app;
