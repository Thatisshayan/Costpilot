import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  
  // Skip CSRF for webhooks (they have their own signature verification)
  if (req.originalUrl?.includes("/webhooks/")) {
    return next();
  }

  // For safe methods, ensure a CSRF token cookie is set
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
    const token = existingToken || generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return next();
  }

  // For state-changing methods, validate the token
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      error: "CSRFProtectionFailed",
      message: "Invalid or missing CSRF token",
    });
    return;
  }

  next();
}
