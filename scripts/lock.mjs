import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
for (const w of [1280, 390]) {
  const p = await (await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 800 }, deviceScaleFactor: w < 600 ? 2 : 1 })).newPage();
  await p.goto("http://localhost:3200/rsvp/list", { waitUntil: "networkidle" }); await p.waitForTimeout(3800);
  const hit = await p.evaluate(() => { const r = document.querySelector("form button").getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el?.closest("button") ? "button on top" : "COVERED by " + el?.tagName; });
  console.log(w, hit, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth ? "OVERFLOW" : "no overflow"));
  await p.screenshot({ path: `/workspace/cynthias-wedding-plans/screenshots/rsvp-list-${w < 600 ? "mobile-390-full" : "desktop-1280"}.png`, fullPage: w < 600 });
}
await b.close();
