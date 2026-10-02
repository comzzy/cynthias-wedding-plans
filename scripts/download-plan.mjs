import { chromium } from "playwright-core"; import fs from "fs"; import { execSync } from "child_process";
const BASE = process.argv[2] || "http://localhost:3200"; const OUT = process.argv[3] || "/tmp/dp"; fs.mkdirSync(OUT, { recursive: true });
const res = []; const ok = (c, m) => { if (!c) throw new Error(m); };
const t = async (n, f) => { try { await f(); res.push("PASS " + n); } catch (e) { res.push("FAIL " + n + ": " + e.message.slice(0, 220)); } };
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const MSGS = ["Budget is 5 million, about 180 guests, Lagos, the wedding is on Saturday 12 December", "We booked Lens by Tolu for photos, and the caterer quoted 1.4 million for jollof and small chops"];
let state = null;
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => { if (!localStorage.getItem("cwp.voice.v1")) localStorage.setItem("cwp.voice.v1", "0"); if (s && !localStorage.getItem("cwp.plan.v1")) { localStorage.setItem("cwp.plan.v1", s.plan); localStorage.setItem("cwp.chat.v1", s.chat); } }, state);
  const p = await ctx.newPage();
  await p.goto(BASE + "/planner", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  if (!state) await t(`${w}: typed planner messages`, async () => {
    for (const m of MSGS) {
      await p.fill("#say", m); await p.getByRole("button", { name: "Send" }).click();
      await p.waitForFunction(() => document.querySelector("#say") && !document.querySelector("#say").value && !/Updating your plan/.test(document.body.innerText), null, { timeout: 45000 });
      await p.waitForTimeout(1500);
    }
    state = await p.evaluate(() => ({ plan: localStorage.getItem("cwp.plan.v1"), chat: localStorage.getItem("cwp.chat.v1") }));
    const pl = JSON.parse(state.plan); res.push(`  plan: guests=${pl.facts.guests} budget=${pl.facts.budget} date=${pl.facts.date} tasks=${pl.tasks.length} vendors=${pl.vendors.map(v=>v.category+":"+v.status).join(",")}`);
  });
  await t(`${w}: Download plan button near Start over, calls print`, async () => {
    const btn = p.getByRole("button", { name: "Download plan" }); await btn.waitFor({ timeout: 10000 });
    ok(await p.getByRole("button", { name: "Start over" }).isVisible(), "no start over");
    await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await btn.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    const box = await p.locator("h2:has-text('Everything')").locator("xpath=../..").boundingBox();
    await p.screenshot({ path: `${OUT}/button-${w}.png`, clip: { x: 0, y: Math.max(0, box.y - 16), width: w, height: Math.min(box.height + 32, 260) } });
    await btn.click(); ok(await p.evaluate(() => window.__printed) === 1, "print not called");
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sideways scroll");
  });
  await t(`${w}: print layout has date, guests, all four sections, visible`, async () => {
    await p.emulateMedia({ media: "print" });
    const info = await p.evaluate(() => {
      const pp = document.querySelector("#print-plan"); const cs = getComputedStyle(pp);
      const hidden = [...pp.querySelectorAll("*")].filter((e) => { const s = getComputedStyle(e); return s.opacity !== "1" || s.visibility === "hidden"; }).length;
      return { display: cs.display, screen: getComputedStyle(document.querySelector(".plan-screen")).display, heads: [...pp.querySelectorAll("h2 span")].map((e) => e.textContent), text: pp.innerText, hidden, bars: [...pp.querySelectorAll(".pp-bar i")].map((i) => i.getBoundingClientRect().width) };
    });
    ok(info.display === "block" && info.screen === "none", "display " + info.display + "/" + info.screen);
    ok(["Checklist", "Budget", "The day", "Vendors"].every((h) => info.heads.includes(h)), "heads " + info.heads);
    ok(/guests/i.test(info.text) && /December/.test(info.text), "date/guests missing"); ok(info.hidden === 0, "invisible els " + info.hidden);
    ok(info.bars.length > 3 && info.bars.every((x) => x > 0), "bars " + info.bars);
    await p.emulateMedia({ media: "screen" });
  });
  await t(`${w}: PDF renders`, async () => {
    await p.emulateMedia({ media: "print" }); await p.pdf({ path: `${OUT}/plan-${w}.pdf`, format: "A4", printBackground: true, preferCSSPageSize: true });
    const pages = execSync(`pdfinfo ${OUT}/plan-${w}.pdf | grep Pages`).toString().trim(); res.push("  " + pages);
    execSync(`pdftoppm -png -r 70 ${OUT}/plan-${w}.pdf ${OUT}/plan-${w}`);
    const txt = execSync(`pdftotext ${OUT}/plan-${w}.pdf -`).toString(); ok(/Checklist/.test(txt) && /Vendors/.test(txt) && !/Talk to me/.test(txt), "pdf content");
  });
  await ctx.close();
}
await b.close(); console.log(res.join("\n"));
