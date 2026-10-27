import { requireUser } from "@/lib/server/auth";
import { body, json, route } from "@/lib/server/http";
import { lookup, undoReport, type ReportDoc } from "@/lib/server/reports";
import { normalize } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const { uid } = await requireUser(req);
  const { id, prev, number } = await body<{ id?: string; prev?: ReportDoc | null; number?: string }>(req);
  await undoReport(String(id || ""), prev ?? null, uid);
  const n = normalize(number);
  const result = n ? (await lookup([n], uid))[0] : null;
  return json({ ok: true, result });
});
