import { chromium } from "playwright-core";
const which = process.argv[2];
const file = which === "rsvp" ? "/tmp/rsvp.wav" : "/tmp/wish.wav";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: [
  "--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
  `--use-file-for-fake-audio-capture=${file}%noloop`, "--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["microphone"] });
const p = await ctx.newPage();
p.on("pageerror", e => console.log("pageerror:", e.message));
p.on("response", r => { if (r.url().includes("/api/")) console.log("API", r.request().method(), new URL(r.url()).pathname, r.status()); });
const OUT = "/workspace/cynthias-wedding-plans/screenshots";
if (which === "rsvp") {
  await p.goto("http://localhost:3200/rsvp", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Tap to speak your RSVP" }).click({ force: true });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/rsvp-desktop-1280-listening.png` });
  await p.waitForTimeout(5600);
  await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
  await p.waitForSelector("text=Did we get it right?", { timeout: 30000 });
  await p.waitForTimeout(1500);
  console.log("HEARD:", await p.locator("text=You said").innerText());
  console.log("NAME:", await p.locator("input").first().inputValue());
  await p.screenshot({ path: `${OUT}/rsvp-desktop-1280-confirm.png` });
  await p.getByRole("button", { name: "Send my RSVP" }).click();
  await p.waitForSelector("h1:has-text('Thank you')", { timeout: 20000 });
  await p.getByRole("button", { name: "Hear a thank-you" }).click();
  await p.waitForSelector("button:has-text('Stop')", { timeout: 20000 });
  console.log("thank-you playing");
  await p.waitForSelector("button:has-text('Hear a thank-you')", { timeout: 30000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/rsvp-desktop-1280-thanks.png` });
} else {
  await p.goto("http://localhost:3200/guestbook", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.fill("#wname", "Cousin Kemi");
  await p.getByRole("button", { name: "Tap to record your wish" }).click({ force: true });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${OUT}/guestbook-desktop-1280-recording.png` });
  await p.waitForTimeout(4000);
  await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
  await p.waitForSelector("text=Added to", { timeout: 40000 });
  console.log("ADDED:", await p.locator("text=Added to").locator("..").innerText());
  // play it back from the keepsake
  await p.getByRole("button", { name: "Play this wish" }).first().click();
  await p.waitForTimeout(1500);
  console.log("playback button now:", await p.getByRole("button", { name: /this wish/ }).first().getAttribute("aria-label"));
}
await b.close();
