"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const AuditLog_1 = __importDefault(require("../lab models/AuditLog"));
// Generic lab audit helper. Best-effort only: never throws.
async function logAudit(req, action, entity, details = {}) {
    try {
        const anyReq = req || {};
        const userFromReq = anyReq.user || {};
        const headers = anyReq.headers || {};
        const actorId = userFromReq.uid || userFromReq.id || userFromReq._id || headers["x-user-id"];
        const actorRole = userFromReq.role || headers["x-user-role"];
        const actorName = userFromReq.username || userFromReq.name || headers["x-user-name"];
        const user = actorName || actorId || "anonymous";
        const entry = {
            action,
            entity,
            user: String(user),
            details: {
                ...details,
                actor: {
                    id: actorId ? String(actorId) : undefined,
                    role: actorRole ? String(actorRole) : undefined,
                    name: actorName ? String(actorName) : undefined,
                },
                method: anyReq.method,
                path: anyReq.originalUrl || anyReq.url,
                ip: headers["x-forwarded-for"] ||
                    anyReq.ip ||
                    (anyReq.connection && anyReq.connection.remoteAddress) ||
                    undefined,
            },
        };
        await AuditLog_1.default.create(entry);
    }
    catch (err) {
        try {
            console.warn("[lab/audit] Failed to log event", action, entity, (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        catch {
            // swallow
        }
    }
}
