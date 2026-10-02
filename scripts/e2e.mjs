import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: [
  "--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
  "--use-file-for-fake-audio-capture=/tmp/e2e-in.wav", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["microphone"] });
const p = await ctx.newPage();
p.on("pageerror", e => console.log("pageerror:", e.message));
p.on("response", async r => { if (r.url().includes("/api/")) console.log("API", r.request().method(), new URL(r.url()).pathname, r.status()); });
await p.goto("http://localhost:3200/planner", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
await p.getByRole("button", { name: "Tap to talk to your planner" }).click();
await p.waitForTimeout(1200);
await p.screenshot({ path: "/tmp/listening.png" });
await p.waitForTimeout(4300);
await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
const t0 = Date.now();
await p.waitForSelector("text=Speaking. Tap to stop", { timeout: 30000 });
console.log("speaking after", Date.now() - t0, "ms");
await p.waitForTimeout(1200);
await p.screenshot({ path: "/tmp/speaking.png" });
await p.waitForSelector("text=Tap the mic and tell me anything", { timeout: 40000 });
console.log("done after", Date.now() - t0, "ms");
const chat = await p.evaluate(() => localStorage.getItem("cwp.chat.v1"));
console.log("CHAT", chat);
const plan = JSON.parse(await p.evaluate(() => localStorage.getItem("cwp.plan.v1")));
console.log("FACTS", JSON.stringify(plan.facts), "tasks", plan.tasks.length);
await ctx.storageState({ path: "/tmp/state.json" });
await b.close();
