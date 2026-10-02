import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
for (const w of [1280, 390]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: w < 600 ? 2 : 1 })).newPage();
  p.on("pageerror", e => console.log("pageerror", e.message));
  await p.goto("http://localhost:3200/", { waitUntil: "networkidle" });
  const btn = p.getByRole("button", { name: "Hear the note" });
  const n = await btn.count(); console.log(w, "buttons", n);
  if (!n) continue;
  await btn.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  await btn.click(); await p.waitForTimeout(2500);
  const h = await p.evaluate(() => [...document.querySelectorAll("[aria-hidden] > span.w-\\[3px\\]")].map(s => parseInt(s.style.height)));
  console.log(w, "playing label:", await p.getByRole("button", { name: "Pause the note" }).count(), "bar heights:", h.slice(0, 12).join(","));
  const box = await p.locator("section:has(> div.paper), section").filter({ hasText: "With all my love" }).last().boundingBox();
  await p.screenshot({ path: `/tmp/note-${w}.png`, clip: { x: 0, y: box.y + box.height - 420, width: w, height: 420 } });
  console.log(w, "overflow", await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
}
await b.close();
