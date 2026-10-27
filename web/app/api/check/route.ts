import { HttpError, requireUser, spendChecks, toMe } from "@/lib/server/auth";
import { body, json, route } from "@/lib/server/http";
import { lookup } from "@/lib/server/reports";
import { normalize } from "@/lib/logic";
import { db } from "@/lib/server/firebase-admin";
import type { UserDoc } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
const MAX = 90;

export const POST = route(async (req: Request) => {
  const { uid } = await requireUser(req);
  const { numbers } = await body<{ numbers?: unknown }>(req);
  if (!Array.isArray(numbers) || !numbers.length) throw new HttpError(400, "Send at least one number.");
  const list = Array.from(new Set(numbers.slice(0, MAX).map(normalize).filter((n): n is string => !!n)));
  if (!list.length) throw new HttpError(400, "That isn't a valid Sri Lankan number. Try 10 digits, like 077 123 4567.");
  await spendChecks(uid, list.length, { bulk: numbers.length > 1 });
  const results = await lookup(list, uid);
  const fresh = (await db().doc(`users/${uid}`).get()).data() as UserDoc;
  return json({ results, me: toMe(uid, fresh) });
});
