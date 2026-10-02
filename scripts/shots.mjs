import { chromium } from "playwright-core";
import fs from "node:fs";
const OUT = "/workspace/cynthias-wedding-plans/screenshots";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const state = JSON.parse(fs.readFileSync("/tmp/state.json", "utf8"));
async function shot(path, w, name, { full = false, filled = false, tab = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 800 }, deviceScaleFactor: w < 600 ? 2 : 1, ...(filled ? { storageState: state } : {}) });
  const p = await ctx.newPage();
  p.on("pageerror", e => console.log("pageerror:", e.message));
  await p.goto("http://localhost:3200" + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(3800);
  if (tab) { await p.getByRole("tab", { name: tab }).click(); await p.waitForTimeout(1500); }
  if (full) {
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 350) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(220); }
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1200);
  }
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  await ctx.close(); console.log("saved", name);
}
const only = process.argv[2];
const jobs = [
  ["/", 1280, "landing-desktop-1280", {}],
  ["/", 1280, "landing-desktop-1280-full", { full: true }],
  ["/", 390, "landing-mobile-390", {}],
  ["/", 390, "landing-mobile-390-full", { full: true }],
  ["/planner", 1280, "planner-desktop-1280-empty", {}],
  ["/planner", 1280, "planner-desktop-1280-filled", { filled: true }],
  ["/planner", 1280, "planner-desktop-1280-budget", { filled: true, tab: "Budget" }],
  ["/planner", 390, "planner-mobile-390-empty", {}],
  ["/planner", 390, "planner-mobile-390-filled-full", { filled: true, full: true }],
  ["/rsvp", 1280, "rsvp-desktop-1280", {}],
  ["/rsvp", 390, "rsvp-mobile-390", {}],
  ["/rsvp/list", 1280, "rsvp-list-desktop-1280", { full: true }],
  ["/rsvp/list", 390, "rsvp-list-mobile-390-full", { full: true }],
  ["/guestbook", 1280, "guestbook-desktop-1280", {}],
  ["/guestbook", 1280, "guestbook-desktop-1280-full", { full: true }],
  ["/guestbook", 390, "guestbook-mobile-390-full", { full: true }],
];
for (const [path, w, name, o] of jobs) if (!only || name.includes(only)) await shot(path, w, name, o);
await b.close();
