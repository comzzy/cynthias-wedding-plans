#!/usr/bin/env node
/**
 * Optional demo seed: a handful of realistic RSVPs and written guestbook wishes.
 * Uses the app's own API, so it works locally (files in .data/) and on a deployment (Vercel Blob).
 * No ElevenLabs credits are used: RSVPs are saved directly, and wishes are text (tagged by the open model).
 *
 *   npm run start            # or npm run dev
 *   node scripts/seed-demo.mjs                       # seeds http://localhost:3000
 *   BASE=https://your-app.vercel.app node scripts/seed-demo.mjs
 */
const BASE = (process.env.BASE || "http://localhost:3000").replace(/\/$/, "");

const rsvps = [
  { name: "Aunty Ngozi Okafor", attending: true, partySize: 4, dietary: ["no pepper"], note: "Congratulations my dear! We'll be there early.", language: "English" },
  { name: "Tunde Bakare", attending: true, partySize: 1, dietary: ["vegetarian"], note: "I go come. I no dey chop meat o. God bless una!", language: "Pidgin" },
  { name: "Funmi Adebayo", attending: true, partySize: 2, dietary: ["no pepper"], note: "Congrats my sister! Coming with my husband. Abeg no add pepper for am.", language: "Pidgin" },
  { name: "Chioma Eze", attending: false, partySize: 0, dietary: [], note: "I'll be in London that week. Sending all my love.", language: "English" },
  { name: "Dr. Ibrahim Musa", attending: true, partySize: 2, dietary: ["halal"], note: "Honoured to celebrate with you both.", language: "English" },
  { name: "Ada Nwosu", attending: true, partySize: 3, dietary: ["nut allergy"], note: "Coming with my husband and our little one.", language: "English" },
];

const wishes = [
  ["Mama Adaeze", "Cynthia, my daughter, may God bless this union with peace, laughter and children that will make you proud. Amen."],
  ["Uncle Emeka", "Advice from someone married twenty years: never go to bed angry, and always let him think the remote was his idea."],
  ["Ifeoma", "I still remember the day you called me screaming because he finally asked. You were in the market holding tomatoes!"],
  ["Bayo", "If she ever says she's not hungry, order two plates of small chops anyway. Trust me on this one."],
  ["Grandma Theresa", "Pray together, laugh together, and keep choosing each other, even on the hard days. God keep you both."],
];

async function post(path, body, form = false) {
  const r = await fetch(BASE + path, form ? { method: "POST", body } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error ?? ""}`);
  return d;
}

for (const r of rsvps) {
  await post("/api/rsvp", { ...r, transcript: "" });
  console.log("RSVP  ", r.name);
}
for (const [name, text] of wishes) {
  const f = new FormData();
  f.append("name", name);
  f.append("text", text);
  const d = await post("/api/guestbook", f, true);
  console.log("Wish  ", name, "→", d.wish.theme, `"${d.wish.title}"`);
}
console.log(`\nSeeded ${rsvps.length} RSVPs and ${wishes.length} wishes at ${BASE}`);
