import { normalize, isMobile, pretty, masked, extract, aggregate, score } from "../lib/logic.ts";
import { plans, planFor, monthKey } from "../lib/plans.ts";

let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) { fail++; console.log("FAIL", name, "got", got, "want", want); }
}

// normalize
eq("07x", normalize("0771234567"), "94771234567");
eq("+94", normalize("+94 77 123 4567"), "94771234567");
eq("0094", normalize("0094771234567"), "94771234567");
eq("94", normalize("94771234567"), "94771234567");
eq("9 digit", normalize("771234567"), "94771234567");
eq("dashes", normalize("077-123-4567"), "94771234567");
eq("landline", normalize("0112345678"), "94112345678");
eq("short", normalize("07712345"), null);
eq("long", normalize("077123456789"), null);
eq("zero after 94", normalize("94071234567"), null);
eq("empty", normalize(""), null);
eq("mobile", isMobile("94771234567"), true);
eq("not mobile", isMobile("94112345678"), false);
eq("pretty", pretty("94771234567"), "077 123 4567");
eq("masked", masked("94771234567"), "077 ••• ••67");

// extract
const paste = `Order 1 - Nimal, Kandy 077 123 4567 Rs.2500
Order 2: Kumari +94 71 234 5678 Galle
3) 0761112223 COD
dup 0771234567
order id 12345678901234 should skip
landline 011-2345678
tel:94751234567.`;
eq("extract", extract(paste), ["94771234567", "94712345678", "94761112223", "94112345678", "94751234567"]);
eq("extract none", extract("hello Rs 2500 x2"), []);

// score
const s = (docs: object[]) => score(aggregate(docs));
eq("new", s([]).level, "new");
eq("one delivered = watch", s([{ del: 1 }]).level, "watch");
eq("two delivered = good", s([{ del: 2 }]).level, "good");
eq("one reject only = watch", s([{ rej: 1 }]).level, "watch");
eq("one fake only = watch", s([{ fake: 1 }]).level, "watch");
eq("same seller 2 rejects = risk", s([{ rej: 2 }]).level, "risk");
eq("fake + reject 2 sellers = risk", s([{ fake: 1 }, { rej: 1 }]).level, "risk");
eq("mostly good", s([{ del: 5 }, { rej: 1 }]).level, "good");
eq("half bad = watch", s([{ del: 2 }, { rej: 1 }]).level, "watch");
eq("two sellers fake = risk", s([{ del: 5, fake: 1 }, { fake: 1 }]).level, "risk");

// plans
const now = new Date("2026-10-28T00:00:00Z");
eq("free default", planFor({}, now).id, "free");
eq("paid active", planFor({ plan: "starter", planUntil: new Date("2026-11-20T00:00:00Z") }, now).id, "starter");
eq("paid expired", planFor({ plan: "pro", planUntil: new Date("2026-10-01T00:00:00Z") }, now).id, "free");
eq("month key", monthKey(new Date("2026-10-31T20:00:00Z")), "2026-11"); // Colombo time is already November
eq("free limit", plans.free.checksPerMonth, 30);
eq("pro unlimited", plans.pro.checksPerMonth, null);

console.log(fail ? `${fail} failed` : "all passed");
process.exit(fail ? 1 : 0);
