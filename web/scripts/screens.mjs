// Takes phone, tablet and desktop screenshots of every page in demo mode.
// Usage: BASE=http://localhost:3000 node scripts/screens.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = process.env.OUT || "screens";
mkdirSync(OUT, { recursive: true });

const sizes = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 }
];
const problems = [];
const browser = await chromium.launch();
const step = async (label, fn) => { try { await fn(); } catch (e) { problems.push(`${label}: ${String(e.message || e).split("\n")[0]}`); } };

for (const scheme of ["light", "dark"]) {
  for (const size of sizes) {
    if (scheme === "dark" && size.name === "tablet") continue;
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, colorScheme: scheme });
    const page = await ctx.newPage();
    page.on("pageerror", e => problems.push(`${size.name} ${scheme} pageerror: ${e.message}`));
    const shot = async (name) => {
      await page.waitForTimeout(700);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > size.width + 1) problems.push(`${name} ${size.name} ${scheme}: horizontal overflow ${sw}px`);
      await page.screenshot({ path: `${OUT}/${name}-${size.name}-${scheme}.png`, fullPage: true });
    };

    const tag = `${size.name}/${scheme}`;
    await step(`landing ${tag}`, async () => {
      await page.goto(BASE + "/");
      await page.evaluate(() => localStorage.setItem("hariyata.demoOut", "1"));
      await page.goto(BASE + "/"); await page.waitForSelector(".hero h1", { timeout: 15000 }); await shot("landing");
      await page.evaluate(() => localStorage.removeItem("hariyata.demoOut"));
    });
    await step(`check ${tag}`, async () => {
      await page.goto(BASE + "/check");
      await page.waitForSelector("#checkInput", { timeout: 15000 });
      await page.fill("#checkInput", "077 123 4567");
      await page.click("button.go");
      await page.waitForSelector(".result", { timeout: 15000 }); await page.waitForTimeout(900); await shot("check");
    });
    await step(`bulk ${tag}`, async () => {
      await page.goto(BASE + "/bulk");
      await page.click("text=Paste an example list", { timeout: 15000 });
      await page.click("text=Check all");
      await page.waitForSelector(".dist", { timeout: 15000 }); await shot("bulk");
    });
    for (const p of ["report", "records", "billing", "admin", "info"]) {
      await step(`${p} ${tag}`, async () => {
        await page.goto(BASE + "/" + p);
        await page.waitForSelector("main h1", { timeout: 15000 });
        await shot(p);
      });
    }
    await step(`admin-sellers ${tag}`, async () => {
      await page.goto(BASE + "/admin"); await page.waitForSelector("button[role=tab]", { timeout: 15000 });
      await page.click("button[role=tab]:has-text('Sellers')"); await shot("admin-sellers");
    });
    await ctx.close();
  }
}
await browser.close();
if (problems.length) {
  for (const p of problems.slice(0, 40)) console.log(`::error title=Screenshot::${p.replace(/[\r\n]+/g, " ")}`);
  process.exit(1);
}
console.log("screens ok");
