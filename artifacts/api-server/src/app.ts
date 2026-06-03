import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

import { requireAuth } from "./middlewares/auth";
import { errorHandler } from "./middlewares/errors";

const app: Express = express();

// 1. Initialize security headers using Helmet
app.use(helmet());

// 2. Define standard Rate Limiters
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Too many requests from this IP. Please try again later." },
});

export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per window on sensitive endpoints (workspaces, webhooks)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Sensitive action limit reached. Please slow down." },
});

export const aiScannerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // limit each IP to 15 manual audits/scans per hour to control API costs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "AI scan quota exceeded for this hour. Please try again later." },
});

// Apply global rate limiting
app.use(globalLimiter);

// Apply strict limiters to cost-intensive/AI endpoints
app.use("/api/audits/scan", aiScannerLimiter);
app.use("/api/receipts/upload", aiScannerLimiter);
app.use("/api/intelligence/query", aiScannerLimiter);

// Apply strict limiters to sensitive configuration/transaction endpoints
app.use("/api/webhooks", sensitiveLimiter);
app.use("/api/workspaces", sensitiveLimiter);
app.use("/api/credits", sensitiveLimiter);
app.use("/api/subscriptions", sensitiveLimiter);
app.use("/api/sync", sensitiveLimiter);


// 3. Logger Middleware
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

// 4. Custom mobile-compatible CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

const allowedMobileSchemes = [
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost" // capacitor/cordova Android dev server
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedMobileSchemes.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "1mb",
    verify: (req: any, res, buf) => {
      if (req.originalUrl?.includes("/webhooks/stripe")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Apply Authentication middleware to all API routes
app.use("/api", requireAuth, router);

// Load global error handler (Must be placed AFTER all routing layers)
app.use(errorHandler);

export default app;

