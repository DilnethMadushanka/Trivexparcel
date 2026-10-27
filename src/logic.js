// Hariyata core logic — pure functions, shared by page and tests.
(function (root) {
  // Normalize a Sri Lankan phone number to 94XXXXXXXXX (11 digits) or null.
  function normalize(raw) {
    if (raw == null) return null;
    let d = String(raw).replace(/[^\d+]/g, "");
    if (d.startsWith("+")) d = d.slice(1);
    d = d.replace(/\D/g, "");
    if (d.startsWith("0094")) d = d.slice(2);
    if (d.length === 10 && d.startsWith("0")) d = "94" + d.slice(1);
    else if (d.length === 9 && /^[1-9]/.test(d)) d = "94" + d;
    if (!/^94[1-9]\d{8}$/.test(d)) return null;
    return d;
  }

  function isMobile(n) { return /^947[0-8]\d{7}$/.test(n || ""); }

  // 94771234567 -> 077 123 4567 (display)
  function pretty(n) {
    if (!n) return "";
    const l = "0" + n.slice(2);
    return l.slice(0, 3) + " " + l.slice(3, 6) + " " + l.slice(6);
  }
  // 077 ••• ••67
  function masked(n) {
    if (!n) return "";
    const l = "0" + n.slice(2);
    return l.slice(0, 3) + " ••• ••" + l.slice(8);
  }

  // Pull every SL phone number out of pasted text (WhatsApp/FB order lists).
  function extract(text) {
    const out = [];
    const seen = new Set();
    const re = /(?:\+?94|0094|0)?[\s\-.()]*7[\s\-.]*\d(?:[\s\-.]*\d){7}|(?:\+?94|0094|0)[\s\-.()]*[1-9][\s\-.]*\d(?:[\s\-.]*\d){7}/g;
    const s = String(text || "");
    let m;
    while ((m = re.exec(s))) {
      // avoid grabbing the tail of a longer digit run
      const before = s[m.index - 1];
      const after = s[m.index + m[0].length];
      if ((before && /\d/.test(before)) || (after && /\d/.test(after))) continue;
      const n = normalize(m[0]);
      if (n && !seen.has(n)) { seen.add(n); out.push(n); }
    }
    return out;
  }

  // Aggregate per-seller report docs for one number.
  // doc: {del, rej, fake, by}
  function aggregate(docs) {
    const a = { del: 0, rej: 0, fake: 0, sellers: 0, badSellers: 0, fakeSellers: 0 };
    for (const d of docs) {
      const del = Math.max(0, d.del | 0), rej = Math.max(0, d.rej | 0), fake = Math.max(0, d.fake | 0);
      if (del + rej + fake === 0) continue;
      a.del += del; a.rej += rej; a.fake += fake; a.sellers++;
      if (rej + fake > 0) a.badSellers++;
      if (fake > 0) a.fakeSellers++;
    }
    return a;
  }

  // Score 0–100 (higher = safer) and a level.
  // level: "new" | "good" | "watch" | "risk"
  function score(a) {
    const total = a.del + a.rej + a.fake;
    if (total === 0) return { level: "new", score: null, total };
    const bad = a.rej + 2 * a.fake;
    // Laplace-smoothed delivery rate, fakes weigh double.
    let s = Math.round(((a.del + 1) / (a.del + bad + 2)) * 100);
    let level;
    // A single report on its own never marks someone "risk" — protects buyers
    // from one mistaken or malicious seller.
    if (a.fakeSellers >= 2 || (a.badSellers >= 2 && s < 60) || (s < 45 && total >= 2)) level = "risk";
    else if (s >= 75 && a.del >= 2 && a.fake === 0) level = "good";
    else level = "watch";
    if (level === "risk") s = Math.min(s, 44);
    if (level === "good") s = Math.max(s, 75);
    if (level === "watch") s = Math.min(Math.max(s, 45), 74);
    return { level, score: s, total };
  }

  async function hashNumber(n) {
    const data = new TextEncoder().encode("hariyata.v1:" + n);
    const buf = await (root.crypto || require("crypto").webcrypto).subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const api = { normalize, isMobile, pretty, masked, extract, aggregate, score, hashNumber };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Hariyata = api;
})(typeof window !== "undefined" ? window : globalThis);
