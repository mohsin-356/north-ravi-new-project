"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = verifyJWT;
exports.authorizeRoles = authorizeRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Minimal, self-contained auth middlewares for Lab routes
// Avoids runtime path issues in packaged builds
function verifyJWT(req, res, next) {
    var _a;
    try {
        const authHeader = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || "";
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Missing token" });
        }
        const token = authHeader.slice(7);
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        // attach to req for downstream usage
        req.user = payload;
        return next();
    }
    catch (e) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
function authorizeRoles(roles) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        var _a;
        const role = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.role;
        if (!role)
            return res.status(403).json({ message: "Forbidden" });
        if (!allowed.includes(role))
            return res.status(403).json({ message: "Forbidden" });
        return next();
    };
}
