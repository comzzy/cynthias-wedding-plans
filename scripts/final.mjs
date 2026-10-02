import { chromium } from "playwright-core";
import fs from "node:fs";
const BASE = "https://cynthias-wedding.vercel.app";
const KEY = fs.readFileSync("/workspace/cynthias-wedding-plans/.host-key", "utf8").trim();
const SHOTS = "/workspace/cynthias-wedding-plans/screenshots";
const results = [], created = { rsvps: new Set(), wishes: new Set() }, plans = [], tts = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
async function t(name, fn, p) {
  const s = Date.now();
  try { await fn(); results.push(["PASS", name]); console.log("PASS", name, `${Date.now() - s}ms`); }
  catch (e) { results.push(["FAIL", name, e.message.split("\n")[0]]); console.log("FAIL", name, "-", e.message.split("\n").slice(0, 2).join(" | ")); if (p) await p.screenshot({ path: `/tmp/livefail-${name.replace(/\W+/g, "_")}.png` }).catch(() => {}); }
}
const launch = (file) => chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required", ...(file ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${file}%noloop`] : [])] });
async function page(b, w) {
  // w is used by the console listeners below
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: w < 600 ? 2 : 1, permissions: ["microphone"] });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => consoleErrs.push(`${w} pageerror ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource.*(401|429)/.test(m.text())) consoleErrs.push(`${w} ${p.url()} ${m.text().slice(0, 160)}`); });
  p.on("response", async (r) => {
    const u = r.url();
    try {
      if (u.endsWith("/api/plan") && r.request().method() === "POST") plans.push(await r.json());
      else if (u.endsWith("/api/tts")) tts.push({ status: r.status(), type: r.headers()["content-type"] });
      else if (u.endsWith("/api/rsvp") && r.request().method() === "POST") { const d = await r.json(); if (d.rsvp?.id) created.rsvps.add(d.rsvp.id); }
      else if (u.endsWith("/api/guestbook") && r.request().method() === "POST") { const d = await r.json(); if (d.wish?.id) created.wishes.add(d.wish.id); }
    } catch {}
  });
  return p;
}
const idle = async (p) => { await p.waitForTimeout(400); await p.waitForFunction(() => /tap the mic and tell me anything/i.test(document.querySelector("[aria-live=polite]")?.textContent || ""), null, { timeout: 60000 }); await p.waitForTimeout(600); };
const sendPlan = async (p, action) => { await Promise.all([p.waitForResponse((r) => r.url().endsWith("/api/plan"), { timeout: 60000 }), action()]); await idle(p); };
const noOverflow = async (p) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "horizontal overflow");
const shot = (p, n, full = false) => p.screenshot({ path: `${SHOTS}/final-${n}.png`, fullPage: full });
const consoleErrs = [];
const BAD = /aso-?ebi|elevenlabs|groq|ollama|whisper|\bLLM\b|\bAPI\b|\bblob\b|vercel|\bmodel\b|\bA\.?I\.?\b|open-weight|backend/i;
const sweep = async (p, label) => {
  await noOverflow(p);
  const txt = await p.evaluate(() => document.body.innerText);
  const m = txt.match(BAD); ok(!m, `${label}: copy "${m?.[0]}"`);
  ok(await p.evaluate(() => document.getAnimations().length) > 0, label + ": no animations");
};
const tabs = async (p) => {
  for (const [tab, re] of [["Budget", /total/i], ["The day", /ceremony/i], ["Vendors", /booked|to find|quoted|contacted|nothing yet/i], ["Checklist", /done/i]]) {
    await p.getByRole("tab", { name: tab }).click(); await p.waitForTimeout(700);
    ok(re.test(await p.locator("section[aria-label='Wedding plan']").innerText()), "tab " + tab);
  }
};
const download = async (p) => {
  await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await p.getByRole("button", { name: "Download plan" }).click();
  ok(await p.evaluate(() => window.__printed) === 1, "print not opened");
  await p.emulateMedia({ media: "print" });
  const i = await p.evaluate(() => { const pp = document.querySelector("#print-plan"); return { d: getComputedStyle(pp).display, h: [...pp.querySelectorAll("h2 span")].map((e) => e.textContent).join(","), t: pp.innerText,
    inv: [...pp.querySelectorAll("*")].filter((e) => getComputedStyle(e).opacity !== "1").length }; });
  await p.emulateMedia({ media: "screen" });
  ok(i.d === "block" && i.h === "Checklist,Budget,The day,Vendors" && /guests/i.test(i.t) && /DATE/i.test(i.t) && i.inv === 0, "print " + JSON.stringify({ ...i, t: i.t.slice(0, 80) }));
};

// ---------- PLANNER typed, voice on (1280) + briefing ----------
const plain = await launch();
for (const w of [1280, 390]) {
  const p = await page(plain, w);
  const tag = w < 600 ? "mobile-390" : "desktop-1280";
  await t(`planner ${w}: typed → real model reply${w === 1280 ? " + spoken reply" : ""}`, async () => {
    await p.goto(BASE + "/planner", { waitUntil: "networkidle" });
    await p.evaluate((v) => { localStorage.clear(); localStorage.setItem("cwp.voice.v1", v); }, w === 1280 ? "1" : "0");
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    const n0 = plans.length, t0 = tts.length;
    await sendPlan(p, () => p.getByRole("button", { name: /Budget is ₦5 million/ }).click());
    const r = plans[n0];
    console.log("   source:", r?.source, "| reply:", r?.reply);
    ok(r?.source === "llm", "reply came from " + r?.source);
    ok(/naira|million/i.test(r.reply), "money wording");
    ok(await p.locator("ul li label").count() >= 18, "checklist");
    if (w === 1280) { ok(tts.length > t0 && tts[t0].status === 200 && /audio/.test(tts[t0].type), "tts " + JSON.stringify(tts.slice(t0))); }
    await noOverflow(p);
    await shot(p, `planner-${tag}`);
  }, p);
  await t(`planner ${w}: plan tabs + Download plan`, async () => { await tabs(p); await download(p); await sweep(p, "planner " + w); }, p);
  if (w === 1280) {
    await t("planner 1280: briefing (real model)", async () => {
      await p.getByRole("button", { name: /Voice replies: on/ }).click();
      const n0 = plans.length;
      await sendPlan(p, () => p.getByRole("button", { name: "Today’s briefing" }).click());
      const r = plans[n0]; console.log("   briefing source:", r?.source, "|", r?.reply);
      ok(r?.source === "llm" && /day/i.test(r.reply), "briefing " + JSON.stringify(r).slice(0, 200));
    }, p);
  }
  await p.context().close();
}

// ---------- PLANNER voice (1280) ----------
{
  const b = await launch("/tmp/plan.wav"); const p = await page(b, 1280);
  await t("planner 1280: voice note → transcript → model", async () => {
    await p.goto(BASE + "/planner", { waitUntil: "networkidle" });
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem("cwp.voice.v1", "0"); });
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    const n0 = plans.length;
    await p.getByRole("button", { name: "Tap to talk to your planner" }).click({ force: true });
    await p.waitForTimeout(6400);
    await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
    await idle(p);
    const chat = JSON.parse(await p.evaluate(() => localStorage.getItem("cwp.chat.v1")));
    console.log("   heard:", chat[0]?.text, "| source:", plans[n0]?.source, "| reply:", chat[1]?.text);
    ok(/photographer/i.test(chat[0]?.text ?? ""), "transcript");
    ok(plans[n0]?.source === "llm", "model source " + plans[n0]?.source);
  }, p);
  await b.close();
}

// ---------- RSVP voice + thank-you (1280) ----------
{
  const b = await launch("/tmp/rsvp.wav"); const p = await page(b, 1280);
  await t("rsvp 1280: voice → confirm → send → spoken thank-you", async () => {
    await p.goto(BASE + "/rsvp", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
    await p.getByRole("button", { name: "Tap to speak your RSVP" }).click({ force: true });
    await p.waitForTimeout(8600);
    await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
    await p.waitForSelector("text=Did we get it right?", { timeout: 40000 });
    console.log("   heard:", await p.locator("text=You said").innerText());
    ok(await p.locator("text=no pork").count() === 1, "diet tag");
    await p.locator("input").first().fill("Live Test Kemi");
    await shot(p, "rsvp-confirm-desktop-1280");
    await p.getByRole("button", { name: "Send my RSVP" }).click();
    await p.waitForSelector("h1:has-text('Thank you')", { timeout: 30000 });
    const t0 = tts.length;
    await p.getByRole("button", { name: "Hear a thank-you" }).click();
    await p.waitForSelector("button:has-text('Stop')", { timeout: 20000 });
    await shot(p, "rsvp-thanks-desktop-1280");
    await p.waitForSelector("button:has-text('Hear a thank-you')", { timeout: 30000 });
    ok(tts[t0]?.status === 200, "thank-you tts " + JSON.stringify(tts[t0]));
  }, p);
  await b.close();
}

// ---------- RSVP Pidgin text (390) ----------
{
  const p = await page(plain, 390);
  await t("rsvp 390: Pidgin text → confirm → send", async () => {
    await p.goto(BASE + "/rsvp", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.fill("#rsvp-text", "Na Funmi Adebayo. I go come with my husband. Abeg no add pepper for am. Congrats my sister!");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForSelector("text=Did we get it right?", { timeout: 30000 });
    const name = await p.locator("input").first().inputValue();
    const party = await p.locator("text=/^\\d+$/").first().innerText().catch(() => "?");
    const tags = (await p.locator("[aria-label^='Remove ']").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).join(",");
    console.log("   name:", name, "| party:", party, "| tags:", tags);
    ok(/Funmi/.test(name), "name " + name);
    ok(/pepper|spic/i.test(tags), "pepper tag: " + tags);
    await noOverflow(p);
    await shot(p, "rsvp-pidgin-mobile-390", true);
    await p.locator("input").first().fill("Live Test Funmi");
    await p.getByRole("button", { name: "Send my RSVP" }).click();
    await p.waitForSelector("h1:has-text('Thank you')", { timeout: 30000 });
  }, p);
  await t("guest list 390: refused without password, shows replies after sign-in", async () => {
    const r = await p.request.get(BASE + "/api/rsvp/list"); ok(r.status() === 401, "no-cookie " + r.status());
    await p.goto(BASE + "/rsvp/list", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
    await p.fill("#host-pw", KEY); await p.getByRole("button", { name: "Open" }).click();
    await p.waitForSelector("text=The guest list", { timeout: 20000 }); await p.waitForTimeout(3000);
    ok(await p.locator("text=Live Test Funmi").count() > 0 && await p.locator("text=Live Test Kemi").count() > 0, "both RSVPs listed");
    const csv = await p.request.get(BASE + "/api/rsvp/csv");
    ok(csv.status() === 200 && /Live Test Funmi/.test(await csv.text()), "csv");
    await noOverflow(p);
    await shot(p, "guestlist-mobile-390", true);
  }, p);
  await p.context().close();
}

// ---------- GUESTBOOK voice wish (1280) ----------
{
  const b = await launch("/tmp/wish.wav"); const p = await page(b, 1280);
  await t("guestbook 1280: voice wish → saved → playback", async () => {
    await p.goto(BASE + "/guestbook", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.fill("#wname", "Live Test Auntie");
    await p.getByRole("button", { name: "Tap to record your wish" }).click({ force: true });
    await p.waitForTimeout(7500);
    await p.getByRole("button", { name: "Finish recording" }).click({ force: true });
    await p.waitForSelector("text=Listen back, then send it", { timeout: 15000 });
    await p.getByRole("button", { name: "Send wish" }).click();
    await p.waitForSelector("text=Cynthia will see your wish.", { timeout: 60000 });
    await p.waitForTimeout(1800); await shot(p, "wish-sent-voice-desktop-1280");
    await p.getByRole("button", { name: "Play this wish" }).first().click();
    await p.waitForSelector("button[aria-label='Pause this wish']", { timeout: 15000 });
    await shot(p, "guestbook-desktop-1280", true);
    await p.waitForSelector("button[aria-label='Play this wish']", { timeout: 20000 });
  }, p);
  await b.close();
}
// ---------- GUESTBOOK written wish (390) ----------
{
  const p = await page(plain, 390);
  await t("guestbook 390: written wish → Send wish → Sent", async () => {
    await p.goto(BASE + "/guestbook", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.fill("#wname", "Live Test Bisi");
    await p.getByRole("button", { name: "Prefer to write it?" }).click();
    await p.fill("#wtext", "Live test wish: may your home always be full of laughter and good food.");
    await p.getByRole("button", { name: "Send wish" }).click();
    await p.waitForSelector("text=Cynthia will see your wish.", { timeout: 40000 }); await p.waitForTimeout(1800);
    await p.evaluate(() => { const r = document.querySelector("[role=status]").getBoundingClientRect(); scrollTo(0, r.top + scrollY - 230); }); await p.waitForTimeout(400);
    await shot(p, "wish-sent-mobile-390");
    await p.getByRole("button", { name: "Leave another wish" }).click(); await p.waitForSelector("text=Prefer to write it?");
    await sweep(p, "guestbook 390");
  }, p);
  await p.context().close();
}
// ---------- GUEST LIST lock (1280) ----------
{
  const p = await page(plain, 1280);
  await t("guest list 1280: wrong refused, right works, CSV, Lock, ?key= clean", async () => {
    for (const u of ["/api/rsvp/list", "/api/rsvp/csv"]) ok((await p.request.get(BASE + u)).status() === 401, u + " not 401");
    await p.goto(BASE + "/rsvp/list", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    ok(!/Live Test|Ezinne/.test(await p.content()), "names before auth");
    await shot(p, "guestlist-login-desktop-1280");
    await p.fill("#host-pw", "not-the-password"); await p.getByRole("button", { name: "Open" }).click();
    await p.waitForSelector("[role=alert]", { timeout: 10000 });
    await p.fill("#host-pw", KEY); await p.getByRole("button", { name: "Open" }).click();
    await p.waitForSelector("text=Live Test Kemi", { timeout: 20000 }); await p.waitForTimeout(2000);
    await sweep(p, "guest list 1280"); await shot(p, "guestlist-desktop-1280");
    const a = p.locator('a[href*="/api/rsvp/csv"]').first(); ok(!(await a.getAttribute("href")).includes("key"), "key in csv href");
    const [dl] = await Promise.all([p.waitForEvent("download"), a.click()]); ok(/Live Test Kemi/.test(fs.readFileSync(await dl.path(), "utf8")), "csv");
    await p.getByRole("button", { name: /Lock/ }).click(); await p.waitForSelector("#host-pw", { timeout: 15000 });
    ok((await p.request.get(BASE + "/api/rsvp/list")).status() === 401, "still signed in after lock");
    await p.goto(BASE + "/rsvp/list?key=" + encodeURIComponent(KEY), { waitUntil: "networkidle" }); ok(p.url() === BASE + "/rsvp/list", "url " + p.url().slice(0, 40));
    await p.waitForSelector("text=Live Test Kemi", { timeout: 15000 });
    await p.getByRole("button", { name: /Lock/ }).click(); await p.waitForSelector("#host-pw", { timeout: 15000 });
  }, p);
  await p.context().close();
}
// ---------- SWEEP every page, both widths ----------
for (const w of [390, 1280]) for (const path of ["/", "/planner", "/rsvp", "/guestbook", "/rsvp/list"]) {
  const p = await page(plain, w);
  await t(`sweep ${w} ${path}: no overflow, plain copy, animations`, async () => {
    await p.goto(BASE + path, { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
    await p.waitForTimeout(800); await sweep(p, `${w} ${path}`);
    if (path === "/" ) await shot(p, `landing-${w < 600 ? "mobile-390" : "desktop-1280"}`);
  }, p);
  await p.context().close();
}
{
  const r = await fetch(BASE + "/"); const html = await r.text();
  await t("icon + og tags", async () => {
    for (const tag of ['property="og:title"', 'property="og:description"', 'property="og:image" content="https://cynthias-wedding.vercel.app/opengraph-image.jpg', 'name="twitter:card" content="summary_large_image"', 'rel="icon" href="/icon.svg', 'rel="apple-touch-icon"', 'rel="manifest"']) ok(html.includes(tag), "missing " + tag);
    for (const u of ["/opengraph-image.jpg", "/icon.svg", "/icon1.png", "/apple-icon.png", "/favicon.ico", "/manifest.webmanifest"]) ok((await fetch(BASE + u)).status === 200, u);
  });
}
// ---------- landing note mp3 (both) ----------
for (const w of [1280, 390]) {
  const p = await page(plain, w);
  await t(`landing ${w}: Hear the note plays`, async () => {
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    const btn = p.getByRole("button", { name: "Hear the note" });
    await btn.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); await btn.click(); await p.waitForTimeout(2500);
    ok(await p.getByRole("button", { name: "Pause the note" }).count() === 1, "not playing");
    await shot(p, `note-${w < 600 ? "mobile-390" : "desktop-1280"}`);
  }, p);
  await p.context().close();
}
await plain.close();

fs.writeFileSync("/tmp/live-created.json", JSON.stringify({ rsvps: [...created.rsvps], wishes: [...created.wishes] }));
console.log("\nSUMMARY"); for (const r of results) console.log(r.join(" | "));
console.log("console errors:", consoleErrs.length ? consoleErrs.join("\n  ") : "none");
console.log("created:", JSON.stringify({ rsvps: [...created.rsvps], wishes: [...created.wishes] }), "tts calls:", tts.length);
