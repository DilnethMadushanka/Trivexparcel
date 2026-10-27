import { HttpError, requireUser } from "@/lib/server/auth";
import { body, json, route } from "@/lib/server/http";
import { addReport, lookup } from "@/lib/server/reports";
import { normalize, OUTCOMES, type Outcome } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const { uid, user } = await requireUser(req);
  if (user.status === "blocked") throw new HttpError(403, "Your account is blocked, so you can't report.");
  const { number, outcome } = await body<{ number?: unknown; outcome?: unknown }>(req);
  const n = normalize(number);
  if (!n) throw new HttpError(400, "That isn't a valid Sri Lankan number. Try 10 digits, like 077 123 4567.");
  if (!OUTCOMES.includes(outcome as Outcome)) throw new HttpError(400, "Choose Delivered, Rejected or Fake.");
  const res = await addReport(n, outcome as Outcome, uid);
  const [result] = await lookup([n], uid);
  return json({ ...res, result });
});
