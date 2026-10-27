import { HttpError, requireUser } from "@/lib/server/auth";
import { startGenieCheckout } from "@/lib/server/billing";
import { body, json, route } from "@/lib/server/http";
import { isPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const { uid } = await requireUser(req);
  const { plan } = await body<{ plan?: unknown }>(req);
  if (!isPlanId(plan) || plan === "free") throw new HttpError(400, "Choose Starter or Pro.");
  return json({ url: await startGenieCheckout(uid, plan) });
});
