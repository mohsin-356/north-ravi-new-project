import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  uid: string;
  role: string;
}

export default function authMiddleware(requiredRole?: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Missing token" });
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "secret") as JwtPayload;
      if (requiredRole) {
        if (Array.isArray(requiredRole)) {
          if (!requiredRole.includes(payload.role)) {
            return res.status(403).json({ message: "Forbidden" });
          }
        } else if (payload.role !== requiredRole) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      (req as any).user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
}
