import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod/v4";

export interface CustomError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  req.log?.error(err, `Error processing request ${req.method} ${req.url}`);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Validation failed",
      details: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
        code: e.code,
      })),
    });
  }

  // Handle custom known errors
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: err.name || "InternalServerError",
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
