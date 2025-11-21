import AuditLog from "../lab models/AuditLog";

// Generic lab audit helper. Best-effort only: never throws.
export async function logAudit(
  req: any,
  action: string,
  entity: string,
  details: any = {}
): Promise<void> {
  try {
    const anyReq: any = req || {};
    const userFromReq: any = anyReq.user || {};
    const headers: any = anyReq.headers || {};

    const actorId = userFromReq.uid || userFromReq.id || userFromReq._id || headers["x-user-id"];
    const actorRole = userFromReq.role || headers["x-user-role"];
    const actorName = userFromReq.username || userFromReq.name || headers["x-user-name"];

    const user = actorName || actorId || "anonymous";

    const entry: any = {
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
        ip:
          (headers["x-forwarded-for"] as string) ||
          anyReq.ip ||
          (anyReq.connection && anyReq.connection.remoteAddress) ||
          undefined,
      },
    };

    await (AuditLog as any).create(entry);
  } catch (err) {
    try {
      console.warn("[lab/audit] Failed to log event", action, entity, (err as any)?.message || err);
    } catch {
      // swallow
    }
  }
}
