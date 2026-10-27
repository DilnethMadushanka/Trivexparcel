import { requireUser } from "@/lib/server/auth";
import { deleteReport } from "@/lib/server/admin";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const DELETE = route(async (req: Request) => {
  await requireUser(req, { admin: true });
  await deleteReport(new URL(req.url).searchParams.get("id") || "");
  return json({ ok: true });
});
