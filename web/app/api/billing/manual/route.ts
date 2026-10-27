import { HttpError, requireUser } from "@/lib/server/auth";
import { submitManual } from "@/lib/server/billing";
import { body, json, route } from "@/lib/server/http";
import { isPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const { uid } = await requireUser(req);
  const { plan, method, reference } = await body<{ plan?: unknown; method?: unknown; reference?: unknown }>(req);
  if (!isPlanId(plan) || plan === "free") throw new HttpError(400, "Choose Starter or Pro.");
  if (method !== "bank" && method !== "ezcash") throw new HttpError(400, "Choose bank transfer or eZ Cash.");
  const id = await submitManual(uid, plan, method, String(reference || ""));
  return json({ id });
});
