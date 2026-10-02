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
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: w < 600 ? 2 : 1, permissions: ["microphone"] });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
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
const shot = (p, n, full = false) => p.screenshot({ path: `${SHOTS}/live-${n}.png`, fullPage: full });

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
  await t("guest list 390: refused without key, shows replies with key", async () => {
    const r = await p.request.get(BASE + "/api/rsvp/list"); ok(r.status() === 401, "no-key " + r.status());
    await p.goto(BASE + "/rsvp/list?key=" + encodeURIComponent(KEY), { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
    ok(await p.locator("text=Live Test Funmi").count() > 0 && await p.locator("text=Live Test Kemi").count() > 0, "both RSVPs listed");
    const csv = await p.request.get(BASE + "/api/rsvp/csv?key=" + encodeURIComponent(KEY));
    ok(csv.status() === 200 && /Live Test Funmi/.test(await csv.text()), "csv");
    await noOverflow(p);
    await p.evaluate(() => { document.querySelectorAll("input[type=password]").forEach(() => {}); });
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
    await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
    await p.waitForSelector("text=Added to", { timeout: 45000 });
    await p.waitForTimeout(1500);
    await p.getByRole("button", { name: "Play this wish" }).first().click();
    await p.waitForSelector("button[aria-label='Pause this wish']", { timeout: 15000 });
    await shot(p, "guestbook-desktop-1280", true);
    await p.waitForSelector("button[aria-label='Play this wish']", { timeout: 20000 });
  }, p);
  await b.close();
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
console.log("created:", JSON.stringify({ rsvps: [...created.rsvps], wishes: [...created.wishes] }), "tts calls:", tts.length);
