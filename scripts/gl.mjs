import { chromium } from "playwright-core";
import fs from "node:fs";
const KEY = fs.readFileSync("/workspace/cynthias-wedding-plans/.host-key", "utf8").trim();
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const out = process.argv[2] || "";
for (const w of [390, 1280]) {
  const p = await (await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: w < 600 ? 2 : 1 })).newPage();
  await p.goto("https://cynthias-wedding.vercel.app/rsvp/list?key=" + encodeURIComponent(KEY), { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  const probe = () => p.evaluate(() => [...document.querySelectorAll("main p")].filter((e) => /^Temp Check/.test(e.textContent || "")).map((e) => {
    let o = 1, el = e; while (el) { o *= +getComputedStyle(el).opacity; el = el.parentElement; }
    const r = e.getBoundingClientRect(); return `${e.textContent.trim()} y=${Math.round(r.top + scrollY)} opacity=${o.toFixed(2)}`;
  }));
  console.log(w, "no scroll:", (await probe()).join(" ; "));
  for (let y = 0; y < 4000; y += 300) { await p.mouse.wheel(0, 300); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500);
  console.log(w, "after scroll:", (await probe()).join(" ; "));
  // jump straight to bottom (fast scroll / anchor) and probe
  const p2 = await p.context().newPage(); await p2.goto(p.url(), { waitUntil: "networkidle" }); await p2.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p2.waitForTimeout(2500);
  console.log(w, "jump to bottom:", (await p2.evaluate(() => [...document.querySelectorAll("main p")].filter((e) => /^Temp Check/.test(e.textContent || "")).map((e) => { let o = 1, el = e; while (el) { o *= +getComputedStyle(el).opacity; el = el.parentElement; } return o.toFixed(2); }))).join(","));
  if (out && w === 390) { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800); await p.screenshot({ path: out, fullPage: true }); }
  await p.context().close();
}
await b.close();
