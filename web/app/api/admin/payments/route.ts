import { HttpError, requireUser } from "@/lib/server/auth";
import { decidePayment } from "@/lib/server/billing";
import { body, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const { uid } = await requireUser(req, { admin: true });
  const { id, action } = await body<{ id?: string; action?: string }>(req);
  if (action !== "approve" && action !== "reject") throw new HttpError(400, "Choose approve or reject.");
  await decidePayment(uid, String(id || ""), action);
  return json({ ok: true });
});
