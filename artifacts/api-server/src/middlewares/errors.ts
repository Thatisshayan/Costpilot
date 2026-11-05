import { captureError } from "../lib/sentry";
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface CustomError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the full detailed error for server side observability
  req.log?.error(err, `Error processing request ${req.method}`);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Bad Request",
      message: "Validation failed",
      details: err.issues.map((e: any) => ({
        path: e.path.join("."),
        message: e.message,
        code: e.code,
      })),
    });
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const isCorsRejection = !err.statusCode && typeof err.message === "string" && err.message.startsWith("CORS: origin");
  const statusCode = isCorsRejection ? 403 : err.statusCode || 500;
  if (statusCode >= 500) captureError(err);
  
  // Obfuscate 500 errors or database leaks in production
  let message = err.message || "Internal Server Error";
  let errorName = err.name || "InternalServerError";

  if (statusCode >= 500 && isProduction) {
    message = "An unexpected error occurred. Please try again later.";
    errorName = "InternalServerError";
  }

  res.status(statusCode).json({
    error: errorName,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
