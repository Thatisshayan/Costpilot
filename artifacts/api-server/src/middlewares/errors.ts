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
  // Log the error
  req.log?.error(err, `Error processing request ${req.method} ${req.url}`);

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

  // Handle custom known errors
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: err.name || "InternalServerError",
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
