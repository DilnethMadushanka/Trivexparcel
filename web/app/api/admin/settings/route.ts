import { requireUser } from "@/lib/server/auth";
import { setSettings } from "@/lib/server/admin";
import { body, json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  await requireUser(req, { admin: true });
  const { requireApproval } = await body<{ requireApproval?: boolean }>(req);
  await setSettings({ requireApproval: !!requireApproval });
  return json({ ok: true });
});
