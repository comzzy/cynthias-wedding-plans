import { chromium } from "playwright-core";
const BASE = "http://localhost:3200", KEY = "e2e-key";
const results = [];
const only = process.argv[2];
async function t(name, fn, page) {
  if (only && !new RegExp(only, "i").test(name)) return;
  const s = Date.now();
  try { await fn(); results.push(["PASS", name]); console.log("PASS", name, `${Date.now() - s}ms`); }
  catch (e) { results.push(["FAIL", name, e.message.split("\n")[0]]); console.log("FAIL", name, "-", e.message.split("\n").slice(0, 3).join(" | ")); if (page) await page.screenshot({ path: `/tmp/fail-${name.replace(/\W+/g, "_")}.png` }).catch(() => {}); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };
async function launch(file) {
  const args = ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"];
  if (file) args.push("--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${file}%noloop`);
  return chromium.launch({ executablePath: "/usr/bin/google-chrome", args });
}
async function page(b, w) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, permissions: ["microphone", "clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon|401/.test(m.text())) p.errors.push("console: " + m.text()); });
  p.on("dialog", (d) => d.accept());
  return p;
}
const noOverflow = async (p) => { const [sw, iw] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); ok(sw <= iw, `horizontal overflow ${sw}>${iw}`); };
const idle = async (p) => { await p.waitForTimeout(400); await p.waitForFunction(() => /tap the mic and tell me anything/i.test(document.querySelector("[aria-live=polite]")?.textContent || "") && !document.querySelector("button[disabled][aria-label^='Working']"), null, { timeout: 45000 }); await p.waitForTimeout(600); };
const sendPlan = async (p, action) => { await Promise.all([p.waitForResponse((r) => r.url().includes("/api/plan"), { timeout: 45000 }), action()]); await idle(p); };
const json = async (p, url, opts) => p.evaluate(async ([u, o]) => { const r = await fetch(u, o); return { status: r.status, body: await r.text() }; }, [url, opts]);

const plain = await launch();
for (const w of [1280, 390]) {
  const p = await page(plain, w);
  // ---------- LANDING ----------
  await t(`landing ${w}: loads, copy, links`, async () => {
    await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
    ok((await p.locator("h1").innerText()).includes("WEDDING"), "hero h1");
    const html = await p.content();
    ok(html.includes("matching outfit colours") && html.includes("With all my love, your best friend,"), "Kane's note");
    ok(!/aso-ebi/i.test(await p.locator("main").innerText()), "aso-ebi still in landing copy");
    ok(!/naira/i.test(await p.locator("main").innerText()), "naira in landing copy");
    for (const h of ["/planner", "/rsvp", "/guestbook"]) ok(await p.locator(`main a[href="${h}"]`).count() > 0, "card link " + h);
    await noOverflow(p);
    await p.getByRole("link", { name: "How it works" }).click(); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => scrollY) > 300, "how-it-works anchor didn't scroll");
    ok(p.errors.length === 0, "errors: " + p.errors.join("; "));
  }, p);
  await t(`landing ${w}: nav to planner`, async () => {
    await p.locator("header").getByRole("link", { name: "Planner" }).click();
    await p.waitForURL("**/planner"); await p.waitForSelector("text=Talk to me");
  }, p);

  // ---------- PLANNER (text) ----------
  await t(`planner ${w}: empty state + voice off`, async () => {
    await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    ok(await p.locator("text=Nothing yet").count() > 0, "empty state");
    await p.getByRole("button", { name: /Voice replies: on/ }).click();
    ok(await p.getByRole("button", { name: /Voice replies: off/ }).count() === 1, "toggle");
    await noOverflow(p);
  }, p);
  await t(`planner ${w}: text plan via suggestion`, async () => {
    await sendPlan(p, () => p.getByRole("button", { name: /Budget is ₦5 million/ }).click());
    ok(await p.locator("text=days to go").count() === 1, "countdown");
    ok(await p.locator("text=₦5,000,000").count() > 0, "budget chip");
    ok(await p.locator("text=200 guests").count() > 0, "guests chip");
    const n = await p.locator("ul li label").count(); ok(n >= 18, "tasks " + n);
    ok(await p.locator("text=Pick the matching family outfit fabric and colours").count() === 1, "outfit task wording");
    ok(await p.getByRole("link", { name: "Open the RSVP page" }).count() === 1, "RSVP task link");
  }, p);
  await t(`planner ${w}: vendor update by text`, async () => {
    await p.fill("#say", "The caterer, Mama Tee Kitchen, quoted ₦1.4 million. And we booked Oriental Hotel for the reception.");
    await sendPlan(p, () => p.getByRole("button", { name: "Send" }).click());
    await p.getByRole("tab", { name: "Vendors" }).click(); await p.waitForTimeout(800);
    const txt = await p.locator("section[aria-label='Wedding plan']").innerText();
    ok(/Mama Tee Kitchen/i.test(txt) && /Oriental Hotel/i.test(txt), "vendors: " + txt.slice(0, 200));
    ok(/booked/i.test(txt) && /quoted/i.test(txt), "statuses");
    await p.getByRole("tab", { name: "Checklist" }).click(); await p.waitForTimeout(600);
    const venue = p.locator("label", { hasText: "Book the reception venue" });
    ok(await venue.locator("input").isChecked(), "venue task not ticked");
  }, p);
  await t(`planner ${w}: budget + day tabs`, async () => {
    await p.getByRole("tab", { name: "Budget" }).click(); await p.waitForTimeout(800);
    const txt = await p.locator("section[aria-label='Wedding plan']").innerText();
    ok(txt.includes("₦5,000,000") && txt.includes("Attire & family outfits"), "budget tab");
    await p.getByRole("tab", { name: "The day" }).click(); await p.waitForTimeout(800);
    ok((await p.locator("section[aria-label='Wedding plan'] ol li").count()) >= 5, "timeline");
    await p.getByRole("tab", { name: "Checklist" }).click(); await p.waitForTimeout(500);
  }, p);
  await t(`planner ${w}: tick task persists after reload`, async () => {
    const before = await p.locator("text=/\\d+ of \\d+ done/").innerText();
    await p.locator("label", { hasText: "Order the cake" }).click(); await p.waitForTimeout(400);
    const after = await p.locator("text=/\\d+ of \\d+ done/").innerText();
    ok(before !== after, `count unchanged ${before}`);
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    ok(await p.locator("label", { hasText: "Order the cake" }).locator("input").isChecked(), "not persisted");
    ok(await p.getByRole("button", { name: /Voice replies: off/ }).count() === 1, "voice pref not persisted");
  }, p);
  await t(`planner ${w}: briefing (text)`, async () => {
    const before = await p.locator("details li").count().catch(() => 0);
    await sendPlan(p, () => p.getByRole("button", { name: "Today’s briefing" }).click());
    const reply = await p.locator("p.font-display.text-\\[1\\.15rem\\]").last().innerText();
    ok(/\bdays?\b/i.test(reply) && !/Mama Tee/.test(reply), "briefing reply: " + reply);
    const chat = await p.evaluate(() => localStorage.getItem("cwp.chat.v1"));
    ok(!/aso-?ebi|aso ebi/i.test(chat), "aso-ebi in a reply: " + chat);
    ok(!/aso-?ebi|aso ebi/i.test(await p.locator("body").innerText()), "aso-ebi visible in planner");
    const headings = (await p.locator("h1, h2, h3, nav, [role=tab], label, .caps").allInnerTexts()).join(" ");
    ok(!/naira/i.test(headings), "naira in planner headings/labels");
    console.log("   briefing:", reply);
  }, p);
  await t(`planner ${w}: start over`, async () => {
    await p.getByRole("button", { name: "Start over" }).click(); await p.waitForTimeout(800);
    ok(await p.locator("text=Nothing yet").count() > 0, "not cleared");
    ok(await p.locator("text=days to go").count() === 0, "countdown remains");
    await noOverflow(p);
    ok(p.errors.length === 0, "errors: " + p.errors.join("; "));
  }, p);
  await p.context().close();
}

// ---------- PLANNER (voice) ----------
{
  const b = await launch("/tmp/plan.wav"); const p = await page(b, 1280);
  await t("planner 1280: voice (mic → Scribe → model)", async () => {
    await p.goto(BASE + "/planner", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem("cwp.voice.v1", "0"); });
    await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await p.getByRole("button", { name: "Tap to talk to your planner" }).click({ force: true });
    await p.waitForTimeout(6400);
    await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
    await idle(p);
    const chat = JSON.parse(await p.evaluate(() => localStorage.getItem("cwp.chat.v1")));
    console.log("   heard:", chat[0]?.text, "| reply:", chat[1]?.text);
    ok(/photographer/i.test(chat[0]?.text ?? ""), "transcript");
    const plan = JSON.parse(await p.evaluate(() => localStorage.getItem("cwp.plan.v1")));
    ok(plan.vendors.some((v) => /photo/i.test(v.category) && v.status === "booked"), "photographer not booked: " + JSON.stringify(plan.vendors));
  }, p);
  await b.close();
}

// ---------- RSVP ----------
{
  const b = await launch("/tmp/rsvp.wav"); const p = await page(b, 1280);
  await t("rsvp 1280: voice → confirm card", async () => {
    await p.goto(BASE + "/rsvp", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
    await noOverflow(p);
    await p.getByRole("button", { name: "Tap to speak your RSVP" }).click({ force: true });
    await p.waitForTimeout(8600);
    await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
    await p.waitForSelector("text=Did we get it right?", { timeout: 30000 });
    const name = await p.locator("input").first().inputValue();
    console.log("   heard name:", name, "|", await p.locator("text=You said").innerText());
    ok(name.length > 1, "no name");
    ok(await p.locator("text=no pork").count() === 1, "diet tag missing");
  }, p);
  await t("rsvp 1280: edit fields + send + thank-you voice", async () => {
    await p.locator("input").first().fill("Kemi Adeyemi");
    await p.getByRole("button", { name: "One more" }).click();
    await p.getByLabel("Add a food need").fill("Vegetarian"); await p.getByLabel("Add a food need").press("Enter");
    ok(await p.locator("text=vegetarian").count() === 1, "added diet");
    await p.getByRole("button", { name: "Remove no pork" }).click();
    ok(await p.locator("text=no pork").count() === 0, "removed diet");
    await p.locator("textarea").fill("Can't wait to dance with you!");
    await p.getByRole("button", { name: "Send my RSVP" }).click();
    await p.waitForSelector("h1:has-text('Thank you')");
    const thanks = await p.locator("h1:has-text('Thank you') + p").innerText();
    ok(/Kemi/.test(thanks) && /3 seats/.test(thanks), "thanks text: " + thanks);
    if (!process.env.NO_TTS) {
      await p.getByRole("button", { name: "Hear a thank-you" }).click();
      await p.waitForSelector("button:has-text('Stop')", { timeout: 20000 });
      await p.waitForSelector("button:has-text('Hear a thank-you')", { timeout: 30000 });
    }
    ok(await p.locator("p[role=alert]").count() === 0, "error shown");
  }, p);
  await t("rsvp 1280: change my answer", async () => {
    await p.getByRole("button", { name: "Change my answer" }).click();
    await p.waitForSelector("text=Did we get it right?");
    ok((await p.locator("input").first().inputValue()) === "Kemi Adeyemi", "draft kept");
    await p.getByRole("button", { name: "Start again" }).click();
    await p.waitForSelector("text=Will you be there?");
  }, p);
  await b.close();
}
for (const w of [390, 1280]) {
  const p = await page(plain, w);
  await t(`rsvp ${w}: text (Pidgin) → decline toggle → send`, async () => {
    await p.goto(BASE + "/rsvp", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    await noOverflow(p);
    await p.fill("#rsvp-text", w === 390 ? "Na Tunde Bakare. I go come, just me. I no dey chop meat o. God bless una!" : "Hello, it's Chioma Eze. I'm so sorry, I won't be able to make it, I'll be in London. Sending love.");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForSelector("text=Did we get it right?", { timeout: 20000 });
    const name = await p.locator("input").first().inputValue();
    if (w === 390) {
      ok(/Tunde/.test(name), "name " + name);
      ok(await p.locator("text=vegetarian").count() === 1, "pidgin diet");
      ok(await p.getByRole("button", { name: "One more" }).count() === 1, "party shown");
    } else {
      ok(/Chioma/.test(name), "name " + name);
      ok(await p.getByRole("button", { name: "One more" }).count() === 0, "party shown for decline");
      await p.getByRole("button", { name: "Joyfully accepts" }).click(); await p.waitForTimeout(500);
      ok(await p.getByRole("button", { name: "One more" }).count() === 1, "party hidden after accept");
      await p.getByRole("button", { name: "Sadly can't come" }).click(); await p.waitForTimeout(500);
    }
    await noOverflow(p);
    await p.getByRole("button", { name: "Send my RSVP" }).click();
    await p.waitForSelector("h1:has-text('Thank you')");
  }, p);
  await p.context().close();
}
{
  const p = await page(plain, 390);
  await t("rsvp 390: empty name rejected", async () => {
    await p.goto(BASE + "/rsvp", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    await p.fill("#rsvp-text", "I'm coming with two friends, no pepper please");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForSelector("text=Did we get it right?", { timeout: 20000 });
    await p.locator("input").first().fill("");
    await p.getByRole("button", { name: "Send my RSVP" }).click();
    await p.waitForSelector("[role=alert]");
    ok(/name/i.test(await p.locator("p[role=alert]").innerText()), "message");
  }, p);
  await t("rsvp 390: same-name update (Kemi changes to not coming)", async () => {
    await p.goto(BASE + "/rsvp", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    await p.fill("#rsvp-text", "This is Kemi Adeyemi again. Sorry, I can't come after all.");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForSelector("text=Did we get it right?", { timeout: 20000 });
    ok((await p.locator("input").first().inputValue()) === "Kemi Adeyemi", "name");
    await p.getByRole("button", { name: "Send my RSVP" }).click();
    await p.waitForSelector("h1:has-text('Thank you')");
  }, p);
  await p.context().close();
}

// ---------- GUEST LIST ----------
for (const w of [1280, 390]) {
  const p = await page(plain, w);
  await t(`guest list ${w}: locked without key / wrong key`, async () => {
    await p.goto(BASE + "/rsvp/list", { waitUntil: "networkidle" });
    ok(await p.locator("text=For Cynthia only").count() === 1, "not locked");
    await p.goto(BASE + "/rsvp/list?key=nope", { waitUntil: "networkidle" });
    ok(await p.locator("text=For Cynthia only").count() === 1, "wrong key not locked");
    ok((await json(p, "/api/rsvp/list")).status === 401 && (await json(p, "/api/rsvp/csv?key=nope")).status === 401, "API not locked");
  }, p);
  await t(`guest list ${w}: key form opens list, totals right`, async () => {
    await p.fill("#key", KEY); await p.getByRole("button", { name: "Open" }).click();
    await p.waitForSelector("text=The guest list"); await p.waitForTimeout(2500);
    const txt = await p.locator("main").innerText();
    const kemi = (txt.match(/Kemi Adeyemi/g) || []).length;
    ok(kemi === 1, "Kemi appears " + kemi + " times");
    ok(/not coming/i.test(txt) && /coming · 1/i.test(txt), "statuses");
    const api = JSON.parse((await json(p, "/api/rsvp/list?key=" + KEY)).body);
    console.log("   totals:", JSON.stringify(api.totals));
    // Kemi said yes (3) by voice, then no by text: latest wins. Tunde yes (1). Chioma no.
    ok(api.totals.responses === 3 && api.totals.attending === 1 && api.totals.declined === 2, "totals " + JSON.stringify(api.totals));
    ok(api.totals.headcount === 1, "headcount " + api.totals.headcount);
    ok(/vegetarian/i.test(txt), "diet summary");
    await noOverflow(p);
  }, p);
  await t(`guest list ${w}: CSV`, async () => {
    const r = await json(p, "/api/rsvp/csv?key=" + KEY);
    ok(r.status === 200 && r.body.startsWith('"Name","Attending"') && r.body.includes("Tunde Bakare"), "csv");
    ok(r.body.trim().split("\n").length === 4, "csv rows " + r.body.trim().split("\n").length);
    const href = await p.getByRole("link", { name: "Download CSV" }).getAttribute("href");
    ok(href.includes("key=" + KEY), "csv link missing key");
  }, p);
  await p.context().close();
}

// ---------- GUESTBOOK ----------
{
  const b = await launch("/tmp/wish.wav"); const p = await page(b, 1280);
  await t("guestbook 1280: empty state, record voice wish", async () => {
    await p.goto(BASE + "/guestbook", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    ok(await p.locator("text=The first page is waiting").count() === 1, "empty state");
    await p.fill("#wname", "Cousin Kemi");
    await p.getByRole("button", { name: "Tap to record your wish" }).click({ force: true });
    await p.waitForTimeout(2500);
    ok(/\d+s left/i.test(await p.locator("text=/Recording ·/i").innerText()), "countdown text");
    await p.waitForTimeout(5000);
    await p.getByRole("button", { name: "Stop and send" }).click({ force: true });
    await p.waitForSelector("text=Added to", { timeout: 40000 });
    ok(/blessings/i.test(await p.locator("text=Added to").innerText()), "theme");
  }, p);
  await t("guestbook 1280: playback", async () => {
    await p.getByRole("button", { name: "Play this wish" }).first().click();
    await p.waitForSelector("button[aria-label='Pause this wish']", { timeout: 10000 });
    await p.waitForSelector("button[aria-label='Play this wish']", { timeout: 15000 }); // ends
  }, p);
  await b.close();
}
for (const w of [390, 1280]) {
  const p = await page(plain, w);
  const wishes = w === 390
    ? [["Uncle Emeka", "Advice from someone married twenty years: never go to bed angry, and always let him think the remote was his idea."], ["Ifeoma", "I still remember the day you called me screaming because he finally asked. You were in the market holding tomatoes!"]]
    : [["Mama Adaeze", "Cynthia, my daughter, may God bless this union with peace, laughter and children that will make you proud. Amen."], ["Bayo", "Bro, if she tells you she's not hungry, order two plates of small chops anyway. Trust me on this one."]];
  await t(`guestbook ${w}: written wishes`, async () => {
    await p.goto(BASE + "/guestbook", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    for (const [n, txt] of wishes) {
      await p.fill("#wname", n);
      await p.waitForTimeout(1200); // let the form finish resetting after the previous wish
      if (!(await p.locator("#wtext").isVisible())) await p.getByRole("button", { name: "Prefer to write it?" }).click();
      await p.locator("#wtext").waitFor({ state: "visible" });
      await p.fill("#wtext", txt);
      await p.getByRole("button", { name: "Add to the book" }).click();
      await p.waitForSelector(`text=${txt.slice(0, 30)}`, { timeout: 20000 });
      await p.waitForTimeout(800);
    }
    await noOverflow(p);
  }, p);
  await t(`guestbook ${w}: filters`, async () => {
    const tabs = p.getByRole("tablist", { name: "Filter wishes" });
    for (const [tab, heading] of [["Advice", "Advice"], ["Funny", "The funny ones"], ["Memories", "Memories"], ["Blessings", "Blessings & prayers"]]) {
      const btn = tabs.getByRole("tab", { name: new RegExp("^" + tab) });
      if (await btn.innerText().then((x) => /· 0/.test(x))) continue;
      await btn.click(); await p.waitForTimeout(900);
      const hs = await p.locator("section[aria-labelledby=keepsake] h3").allInnerTexts();
      ok(hs.length === 1 && hs[0].toLowerCase() === heading.toLowerCase(), `${tab}: ${hs.join(",")}`);
    }
    await tabs.getByRole("tab", { name: /^All/ }).click(); await p.waitForTimeout(900);
    ok((await p.locator("section[aria-labelledby=keepsake] h3").count()) >= 2, "all");
    ok(await p.getByRole("button", { name: "Hide" }).count() === 0, "hide visible to guests");
  }, p);
  await p.context().close();
}
{
  const p = await page(plain, 1280);
  await t("guestbook 1280: host hide", async () => {
    await p.goto(BASE + "/guestbook?key=" + KEY, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    const n = await p.getByRole("button", { name: "Hide" }).count(); ok(n >= 4, "hide buttons " + n);
    const card = p.locator("li", { hasText: "two plates of small chops" });
    await card.getByRole("button", { name: "Hide" }).click(); await p.waitForTimeout(1200);
    ok(await p.locator("text=two plates of small chops").count() === 0, "not hidden in UI");
    await p.goto(BASE + "/guestbook", { waitUntil: "networkidle" });
    ok(await p.locator("text=two plates of small chops").count() === 0, "hidden wish still public");
    const api = JSON.parse((await json(p, "/api/guestbook")).body);
    ok(!api.wishes.some((w) => /small chops/.test(w.text)), "hidden wish in API");
    ok((await json(p, "/api/guestbook/hide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: api.wishes[0].id, key: "nope" }) })).status === 401, "hide w/o key allowed");
  }, p);
  await p.context().close();
}

// ---------- MOTION AUDIT ----------
for (const w of [1280, 390]) {
  const p = await page(plain, w);
  for (const path of ["/", "/planner", "/rsvp", "/rsvp/list", "/rsvp/list?key=" + KEY, "/guestbook"]) {
    await t(`motion ${w}: ${path}`, async () => {
      await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(250);
      const early = await p.evaluate(() => {
        const arch = document.querySelector(".arch")?.parentElement?.closest("[style*='clip-path']");
        const blooms = [...document.querySelectorAll("svg[viewBox='0 0 400 640'], svg[viewBox='0 0 400 620']")].map((el) => +getComputedStyle(el.parentElement).opacity);
        return { clip: arch ? getComputedStyle(arch).clipPath : "none", blooms };
      });
      await p.waitForTimeout(3500);
      const late = await p.evaluate(() => {
        const anims = document.getAnimations().map((a) => a.animationName || a.constructor.name);
        const names = new Set(anims);
        const blooms = [...document.querySelectorAll("svg[viewBox='0 0 400 640'], svg[viewBox='0 0 400 620']")].map((el) => +getComputedStyle(el.parentElement).opacity);
        return {
          petals: document.querySelectorAll(".petal").length,
          names: [...names],
          sways: document.querySelectorAll(".sway, .sway-slow").length,
          staggers: document.querySelectorAll(".stagger").length + document.querySelectorAll("[style*='opacity']").length,
          blooms,
        };
      });
      const need = ["fall", "veinflow", "twinkle", "sway", "inkdrift"];
      for (const n of need) ok(late.names.includes(n), `${n} not running (${late.names.join(",")})`);
      ok(late.petals >= 8, "petals " + late.petals);
      ok(late.blooms.length >= 1, "no bouquets");
      ok(late.sways > 0, "no swaying stems");
      ok(early.clip.startsWith("inset") && !/inset\(0%? 0%? 0%? 0%?\)/.test(early.clip.replace(/px/g, "")), "arch not revealing: " + early.clip);
      ok(early.blooms.some((o) => o < 0.95) && late.blooms.every((o) => o > 0.95), `bouquets not blooming in: ${early.blooms} -> ${late.blooms}`);
      ok(late.staggers > 0, "no staggered/fade content");
      await noOverflow(p);
      const visible = await p.locator("body").innerText();
      ok(!/aso-?ebi|aso ebi|naira/i.test(visible), "local term visible: " + (visible.match(/.{0,30}(aso-?ebi|aso ebi|naira).{0,30}/i) || [""])[0]);
      const desc = await p.evaluate(() => [document.title, document.querySelector("meta[name=description]")?.content ?? ""].join(" "));
      ok(!/aso-?ebi|naira/i.test(desc), "local term in title/description: " + desc);
    }, p);
  }
  await p.context().close();
}
await plain.close();
console.log("\n==== SUMMARY ====");
for (const r of results) console.log(r.join(" | "));
console.log(`${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
