import { requireUser } from "@/lib/server/auth";
import { json, route } from "@/lib/server/http";
import { deleteMyRecord, myRecords } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const { uid } = await requireUser(req);
  return json({ records: await myRecords(uid) });
});

export const DELETE = route(async (req: Request) => {
  const { uid } = await requireUser(req);
  const id = new URL(req.url).searchParams.get("id") || "";
  await deleteMyRecord(id, uid);
  return json({ ok: true });
});
