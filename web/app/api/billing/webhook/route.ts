import { handleGenieWebhook } from "@/lib/server/billing";
import { json, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Called by Dialog Genie after a card payment. Check the signature header name in your Genie docs.
export const POST = route(async (req: Request) => {
  const raw = await req.text();
  await handleGenieWebhook(raw, req.headers.get("x-signature") || req.headers.get("signature"));
  return json({ ok: true });
});
