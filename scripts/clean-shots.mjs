import { chromium } from "playwright-core";
const OUT = "/workspace/cynthias-wedding-plans/screenshots";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
for (const w of [1280, 390]) for (const [path, name] of [["/", "landing"], ["/planner", "planner"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 800 }, deviceScaleFactor: w < 600 ? 2 : 1 });
  const p = await ctx.newPage();
  await p.goto("https://cynthias-wedding.vercel.app" + path, { waitUntil: "networkidle" });
  // scroll through so every scroll-reveal plays, then back to top
  for (let y = 0; y < 9000; y += 500) { await p.mouse.wheel(0, 500); await p.waitForTimeout(120); }
  await p.waitForTimeout(1200); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(3500);
  const text = await p.locator("body").innerText();
  const bad = text.match(/open-weight|ollama|groq|elevenlabs|\bAI\b|scribe|model|offline helper|leave the house/gi);
  const f = `${OUT}/live-clean-${name}-${w < 600 ? "mobile-390" : "desktop-1280"}.png`;
  await p.screenshot({ path: f, fullPage: true });
  console.log(f, "overflow:", await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), "visible tech terms:", bad ?? "none");
  await ctx.close();
}
await b.close();
