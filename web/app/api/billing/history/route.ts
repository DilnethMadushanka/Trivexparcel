import { requireUser } from "@/lib/server/auth";
import { myPayments } from "@/lib/server/billing";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const { uid } = await requireUser(req);
  return json({ payments: await myPayments(uid) });
});
