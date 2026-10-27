import { requireUser, toMe } from "@/lib/server/auth";
import { genieConfigured } from "@/lib/server/billing";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const { uid, user } = await requireUser(req);
  return json({
    me: toMe(uid, user),
    payments: {
      card: genieConfigured(),
      bank: process.env.PAY_BANK_DETAILS || "",
      ezcash: process.env.PAY_EZCASH_NUMBER || ""
    }
  });
});
