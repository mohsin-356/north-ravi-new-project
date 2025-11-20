"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(requiredRole) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer ")))
            return res.status(401).json({ message: "Missing token" });
        const token = authHeader.slice(7);
        try {
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
            if (requiredRole) {
                if (Array.isArray(requiredRole)) {
                    if (!requiredRole.includes(payload.role)) {
                        return res.status(403).json({ message: "Forbidden" });
                    }
                }
                else if (payload.role !== requiredRole) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }
            req.user = payload;
            next();
        }
        catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
    };
}
