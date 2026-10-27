import { HttpError, grantPlan, requireUser } from "@/lib/server/auth";
import { updateUser } from "@/lib/server/admin";
import { body, json, route } from "@/lib/server/http";
import { isPlanId } from "@/lib/plans";
import type { Role, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const { uid: actor } = await requireUser(req, { admin: true });
  const b = await body<{ uid?: string; status?: Status; role?: Role; plan?: unknown; days?: unknown }>(req);
  const uid = String(b.uid || "");
  if (b.plan !== undefined) {
    if (!isPlanId(b.plan)) throw new HttpError(400, "Unknown plan.");
    const days = Math.min(366, Math.max(1, Number(b.days) || 30));
    await grantPlan(uid, b.plan, days);
  }
  if (b.status !== undefined || b.role !== undefined) await updateUser(actor, uid, { status: b.status, role: b.role });
  return json({ ok: true });
});
