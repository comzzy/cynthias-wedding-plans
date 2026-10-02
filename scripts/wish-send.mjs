import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://localhost:3200", SHOT = process.argv[3], VOICE = process.argv[4] === "voice";
const res = []; const ok = (c, m) => { if (!c) throw new Error(m); };
const t = async (n, f) => { try { await f(); res.push("PASS " + n); } catch (e) { res.push("FAIL " + n + ": " + e.message.slice(0, 200)); } };
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ["microphone"] }); const p = await ctx.newPage();
let posts = 0; p.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/api/guestbook")) posts++; });
const ids = [];
await p.goto(BASE + "/guestbook", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
if (VOICE) await t("voice: record → review, no auto-save", async () => {
  await p.getByRole("button", { name: /record your wish/i }).click({ force: true }); await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Finish recording" }).click({ force: true });
  await p.waitForSelector("text=Listen back, then send it", { timeout: 8000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: "/tmp/voice-review.png" }); res.push("  buttons: " + (await p.locator("button").allInnerTexts()).join(" / ").slice(0, 300)); ok(posts === 0, "auto-posted " + posts); ok(await p.getByRole("button", { name: "Send wish" }).isVisible(), "no send button");
  await p.getByRole("button", { name: "Discard" }).click();
});
await t("error state shown, draft kept", async () => {
  await p.getByRole("button", { name: "Prefer to write it?" }).click();
  await p.fill("#wname", "Test Guest Zara"); await p.fill("#wtext", "Temp test wish: may your home be full of laughter.");
  await p.route("**/api/guestbook", (r) => r.request().method() === "POST" ? r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "We couldn't save your wish just now. Please try again." }) }) : r.continue());
  await p.getByRole("button", { name: "Send wish" }).click();
  await p.waitForSelector("[role=alert]", { timeout: 8000 }); ok(await p.inputValue("#wtext") !== "", "draft lost");
  await p.unroute("**/api/guestbook");
});
await t("written wish: loading → sent confirmation", async () => {
  await p.route("**/api/guestbook", async (r) => { if (r.request().method() === "POST") await new Promise((z) => setTimeout(z, 1200)); r.continue(); });
  await p.getByRole("button", { name: "Send wish" }).click();
  await p.waitForSelector("text=Sending…", { timeout: 3000 });
  const resp = await p.waitForResponse((r) => r.url().endsWith("/api/guestbook") && r.request().method() === "POST", { timeout: 30000 });
  const j = await resp.json(); ok(resp.status() === 200, "status " + resp.status() + " " + JSON.stringify(j).slice(0, 100)); ids.push(j.wish.id);
  await p.waitForSelector("text=Cynthia will see your wish.", { timeout: 10000 }); await p.waitForTimeout(1800);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sideways scroll");
  await p.evaluate(() => { const r = document.querySelector("[role=status]").getBoundingClientRect(); scrollTo(0, r.top + window.scrollY - 230); });
  await p.waitForTimeout(500); if (SHOT) await p.screenshot({ path: SHOT });
  await p.getByRole("button", { name: "Leave another wish" }).click(); await p.waitForSelector("text=Prefer to write it?", { timeout: 5000 });
});
console.log(res.join("\n")); console.log("IDS=" + ids.join(",")); await b.close();
