import type { Request, Response, NextFunction } from "express";

// This shim normalizes auth middleware imports between dev (server/middleware/auth)
// and production compiled lab build (lab_dist/lab middleware/auth.js default export).
// It provides two functions: verifyJWT (no role check) and authorizeRoles(roles[]).

// Try to resolve the runtime auth module in a flexible way
function resolveAuthModule(): any {
  try {
    // Dev: named exports from server/middleware/auth
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../middleware/auth");
    return mod;
  } catch (_) {
    try {
      // Prod: default export from lab_dist/lab middleware/auth.js
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("../lab middleware/auth");
      return mod?.default || mod;
    } catch (e) {
      return null;
    }
  }
}

const runtimeAuth = resolveAuthModule();

// If named exports exist, use them directly
let namedVerify: any = runtimeAuth?.verifyJWT;
let namedAuthorize: any = runtimeAuth?.authorizeRoles;

// If default export is a function (role-aware middleware factory), adapt it
if ((!namedVerify || !namedAuthorize) && typeof runtimeAuth === "function") {
  const factory = runtimeAuth as (role?: string | string[]) => (req: Request, res: Response, next: NextFunction) => void;
  namedAuthorize = (roles: string[] | string) => factory(roles);
  namedVerify = factory(undefined);
}

// Fallback no-op (deny) if not resolved; helps surface error clearly
if (!namedVerify || !namedAuthorize) {
  namedVerify = (_req: Request, res: Response, _next: NextFunction) => res.status(500).json({ message: "Auth middleware missing" });
  namedAuthorize = (_roles: any) => (_req: Request, res: Response, _next: NextFunction) => res.status(500).json({ message: "Auth middleware missing" });
}

export const verifyJWT = namedVerify as (req: Request, res: Response, next: NextFunction) => void;
export const authorizeRoles = namedAuthorize as (roles: string[] | string) => (req: Request, res: Response, next: NextFunction) => void;
