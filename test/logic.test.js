const H = require("../src/logic.js");
let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fail++; console.log("FAIL", name, "got", got, "want", want); }
};

// normalize
eq("07x", H.normalize("0771234567"), "94771234567");
eq("+94", H.normalize("+94 77 123 4567"), "94771234567");
eq("0094", H.normalize("0094771234567"), "94771234567");
eq("94", H.normalize("94771234567"), "94771234567");
eq("9digit", H.normalize("771234567"), "94771234567");
eq("dashes", H.normalize("077-123-4567"), "94771234567");
eq("landline", H.normalize("0112345678"), "94112345678");
eq("short", H.normalize("07712345"), null);
eq("long", H.normalize("077123456789"), null);
eq("zero after 94", H.normalize("94071234567"), null);
eq("empty", H.normalize(""), null);
eq("mobile", H.isMobile("94771234567"), true);
eq("not mobile", H.isMobile("94112345678"), false);
eq("079 not mobile", H.isMobile("94791234567"), false);
eq("pretty", H.pretty("94771234567"), "077 123 4567");
eq("masked", H.masked("94771234567"), "077 ••• ••67");

// extract
const paste = `Order 1 - Nimal, Kandy 077 123 4567 Rs.2500
Order 2: Kumari +94 71 234 5678 Galle
3) 0761112223 COD
dup 0771234567
order id 12345678901234 should skip
landline 011-2345678
tel:94751234567.`;
eq("extract", H.extract(paste), ["94771234567", "94712345678", "94761112223", "94112345678", "94751234567"]);
eq("extract none", H.extract("hello Rs 2500 x2"), []);

// score
const s = (docs) => H.score(H.aggregate(docs));
eq("new", s([]).level, "new");
eq("zero docs ignored", s([{ del: 0, rej: 0, fake: 0 }]).level, "new");
eq("one delivered = watch", s([{ del: 1 }]).level, "watch");
eq("two delivered = good", s([{ del: 2 }]).level, "good");
eq("many delivered good", s([{ del: 3 }, { del: 2 }]).level, "good");
eq("one reject only = watch", s([{ rej: 1 }]).level, "watch");
eq("one fake only = watch", s([{ fake: 1 }]).level, "watch");
eq("same seller 2 rejects = risk", s([{ rej: 2 }]).level, "risk");
eq("one fake + one reject 2 sellers = risk", s([{ fake: 1 }, { rej: 1 }]).level, "risk");
eq("mixed mostly good", s([{ del: 5 }, { rej: 1 }]).level, "good");
eq("half bad = watch", s([{ del: 2 }, { rej: 1 }]).level, "watch");
eq("great history w/ one reject", s([{ del: 10 }, { del: 4, rej: 1 }]).level, "good");
eq("two sellers fake = risk", s([{ del: 5, fake: 1 }, { fake: 1 }]).level, "risk");
eq("two bad sellers", s([{ rej: 1 }, { rej: 1 }, { del: 1 }]).level, "risk");
const r = s([{ del: 2 }]); eq("good score >=75", r.score >= 75, true);
const w = s([{ del: 1 }]); eq("watch range", w.score >= 45 && w.score <= 74, true);

H.hashNumber("94771234567").then(h => {
  eq("hash len", h.length, 64);
  return H.hashNumber("94771234567").then(h2 => eq("hash stable", h, h2));
}).then(() => { console.log(fail ? `${fail} failed` : "all passed"); process.exit(fail ? 1 : 0); });
