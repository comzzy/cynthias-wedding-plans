import { chromium } from "playwright-core"; import fs from "fs";
const BASE = "https://cynthias-wedding.vercel.app", KEY = fs.readFileSync("/workspace/cynthias-wedding-plans/.host-key","utf8").trim();
const SHOTS = "/workspace/cynthias-wedding-plans/screenshots/"; const res = []; const ok=(c,m)=>{ if(!c) throw new Error(m); };
const t = async (n,f)=>{ try{ await f(); res.push("PASS "+n);}catch(e){ res.push("FAIL "+n+": "+e.message.slice(0,200)); } };
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const ids = { rsvps: [], wishes: [] };
// seed temp text RSVPs
const seedCtx = await b.newContext();
for (const [name, n] of [["Test Guest Ada", 2], ["Test Guest Bayo", 1]]) {
  const r = await seedCtx.request.post(BASE + "/api/rsvp", { data: { name, attending: true, partySize: n, dietary: ["no pepper"], note: "temp test" } });
  const j = await r.json().catch(()=>({})); res.push(`seed ${name}: ${r.status()}`); 
  if (j.rsvp?.id) ids.rsvps.push(j.rsvp.id); if (j.id) ids.rsvps.push(j.id); if (j.wish?.id) ids.wishes.push(j.wish.id);
}
for (const [w,h] of [[390,844],[1280,800]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor: w===390?3:1 }); const p = await ctx.newPage();
  await t(`${w}: API 401 without cookie`, async()=>{ for (const u of ["/api/rsvp/list","/api/rsvp/csv"]) { const r = await p.request.get(BASE+u); ok(r.status()===401, u+" "+r.status()); }
    const d = await p.request.post(BASE+"/api/admin/delete",{data:{rsvps:["x"]}}); ok(d.status()===401,"delete "+d.status()); });
  await t(`${w}: locked page shows no names, noindex`, async()=>{ await p.goto(BASE+"/rsvp/list",{waitUntil:"networkidle"}); await p.waitForTimeout(2000);
    const html = await p.content(); ok(!html.includes("Test Guest"),"names leaked"); ok(/noindex/.test(html),"no noindex");
    ok(await p.locator("#host-pw").count()===1,"no password field"); await p.screenshot({ path: SHOTS+`live-guestlist-login-${w}.png` }); });
  await t(`${w}: wrong password refused`, async()=>{ await p.fill("#host-pw","definitely-wrong"); await p.getByRole("button",{name:"Open"}).click();
    await p.waitForSelector("[role=alert]",{timeout:10000}); ok(!(await p.content()).includes("Test Guest"),"names after wrong"); });
  await t(`${w}: right password shows list`, async()=>{ await p.fill("#host-pw",KEY); await p.getByRole("button",{name:"Open"}).click();
    await p.waitForSelector("text=Test Guest Ada",{timeout:20000}); ok(p.url()===BASE+"/rsvp/list","url "+p.url());
    const c = (await ctx.cookies()).find(c=>c.name==="cwp_host"); ok(c && c.httpOnly && c.secure && c.sameSite==="Strict" && c.value!==KEY && !c.value.includes(KEY),"cookie flags");
    ok((c.expires - Date.now()/1000) > 29*86400, "expiry"); });
  await t(`${w}: CSV downloads, link has no key`, async()=>{ const a = p.locator('a[href*="/api/rsvp/csv"]').first(); const href = await a.getAttribute("href"); ok(!href.includes("key"),"href "+href);
    const [dl] = await Promise.all([p.waitForEvent("download",{timeout:15000}), a.click()]); const f = await dl.path(); const s = fs.readFileSync(f,"utf8"); ok(s.includes("Test Guest Ada"),"csv content"); });
  await t(`${w}: lock signs out`, async()=>{ await p.getByRole("button",{name:/Lock/}).click(); await p.waitForSelector("#host-pw",{timeout:15000});
    ok(!(await p.content()).includes("Test Guest"),"names after lock"); const r = await p.request.get(BASE+"/api/rsvp/list"); ok(r.status()===401,"api after lock "+r.status()); });
  await t(`${w}: ?key= one-time login redirects clean`, async()=>{ await p.goto(BASE+"/rsvp/list?key="+encodeURIComponent(KEY),{waitUntil:"networkidle"});
    ok(p.url()===BASE+"/rsvp/list","url "+p.url()); await p.waitForSelector("text=Test Guest Ada",{timeout:15000}); });
  if (w===1280) await t(`1280: bad ?key= redirects clean, stays locked`, async()=>{ const c2 = await b.newContext(); const q = await c2.newPage();
    await q.goto(BASE+"/rsvp/list?key=wrong",{waitUntil:"networkidle"}); ok(q.url()===BASE+"/rsvp/list","url"); ok(await q.locator("#host-pw").count()===1,"not locked"); await c2.close(); });
  if (w===1280) { // cleanup with cookie
    const list = await (await p.request.get(BASE+"/api/rsvp/list")).json();
    const arr = list.rsvps || list.items || list; const rids = (Array.isArray(arr)?arr:[]).filter(r=>/Test Guest/.test(r.name)).map(r=>r.id);
    const wl = await (await p.request.get(BASE+"/api/guestbook")).json().catch(()=>({})); const warr = wl.wishes || wl.items || wl;
    const wids = (Array.isArray(warr)?warr:[]).filter(x=>/Temp test wish/.test(x.text||x.message||"")).map(x=>x.id);
    const d = await p.request.post(BASE+"/api/admin/delete",{data:{rsvps:[...new Set([...ids.rsvps,...rids])], wishes:[...new Set([...ids.wishes,...wids])]}}); res.push("cleanup "+d.status()+" "+(await d.text()).slice(0,200));
    const after = await (await p.request.get(BASE+"/api/rsvp/list")).json(); res.push("after: "+JSON.stringify(after).slice(0,300));
    const wa = await (await p.request.get(BASE+"/api/guestbook")).json().catch(()=>null); res.push("wishes after: "+JSON.stringify(wa).slice(0,200));
  }
  await ctx.close();
}
await b.close(); console.log(res.join("\n"));
