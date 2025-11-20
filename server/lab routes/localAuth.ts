import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Minimal, self-contained auth middlewares for Lab routes
// Avoids runtime path issues in packaged builds

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers?.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secret") as any;
    // attach to req for downstream usage
    (req as any).user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function authorizeRoles(roles: string[] | string) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any)?.user?.role;
    if (!role) return res.status(403).json({ message: "Forbidden" });
    if (!allowed.includes(role)) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
}
