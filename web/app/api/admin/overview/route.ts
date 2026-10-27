import { requireUser } from "@/lib/server/auth";
import { overview } from "@/lib/server/admin";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requireUser(req, { admin: true });
  return json(await overview());
});
