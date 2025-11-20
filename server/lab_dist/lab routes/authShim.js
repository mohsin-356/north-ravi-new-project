"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.verifyJWT = void 0;
// This shim normalizes auth middleware imports between dev (server/middleware/auth)
// and production compiled lab build (lab_dist/lab middleware/auth.js default export).
// It provides two functions: verifyJWT (no role check) and authorizeRoles(roles[]).
// Try to resolve the runtime auth module in a flexible way
function resolveAuthModule() {
    try {
        // Dev: named exports from server/middleware/auth
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require("../middleware/auth");
        return mod;
    }
    catch (_) {
        try {
            // Prod: default export from lab_dist/lab middleware/auth.js
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require("../lab middleware/auth");
            return (mod === null || mod === void 0 ? void 0 : mod.default) || mod;
        }
        catch (e) {
            return null;
        }
    }
}
const runtimeAuth = resolveAuthModule();
// If named exports exist, use them directly
let namedVerify = runtimeAuth === null || runtimeAuth === void 0 ? void 0 : runtimeAuth.verifyJWT;
let namedAuthorize = runtimeAuth === null || runtimeAuth === void 0 ? void 0 : runtimeAuth.authorizeRoles;
// If default export is a function (role-aware middleware factory), adapt it
if ((!namedVerify || !namedAuthorize) && typeof runtimeAuth === "function") {
    const factory = runtimeAuth;
    namedAuthorize = (roles) => factory(roles);
    namedVerify = factory(undefined);
}
// Fallback no-op (deny) if not resolved; helps surface error clearly
if (!namedVerify || !namedAuthorize) {
    namedVerify = (_req, res, _next) => res.status(500).json({ message: "Auth middleware missing" });
    namedAuthorize = (_roles) => (_req, res, _next) => res.status(500).json({ message: "Auth middleware missing" });
}
exports.verifyJWT = namedVerify;
exports.authorizeRoles = namedAuthorize;
