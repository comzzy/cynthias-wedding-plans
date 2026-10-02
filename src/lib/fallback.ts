/**
 * Offline helper used ONLY when no open-weight model is reachable.
 * It understands the basics (budget, guests, city, month, "booked the ...")
 * so the demo never dead-ends, and says clearly that the model is offline.
 */
import type { Plan, PlanPatch } from "./types";
import { nairaSpoken, prettyDate, todayISO } from "./format";

const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

function wordsToDigits(s: string) {
  // "two hundred and fifty" -> 250, "five" -> 5 (good enough for speech)
  return s.replace(
    /\b((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|and|a)[\s-]*)+\b/gi,
    (m) => {
      const parts = m.toLowerCase().split(/[\s-]+/).filter((w) => w && w !== "and");
      if (!parts.some((w) => w in WORDS)) return m;
      let total = 0, cur = 0;
      for (const w of parts) {
        if (w === "a") { cur = cur || 1; continue; }
        const v = WORDS[w];
        if (v === undefined) continue;
        if (v === 100) cur = (cur || 1) * 100;
        else cur += v;
      }
      total += cur;
      return total ? ` ${total} ` : m;
    },
  );
}

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan", "Benin", "Owerri", "Asaba", "Kano", "Calabar",
  "Uyo", "Onitsha", "Abeokuta", "Jos", "Kaduna", "Warri", "Ilorin", "Akure", "Lekki", "Ikeja", "Victoria Island"];
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const VENDOR_WORDS: [RegExp, string][] = [
  [/venue|hall|event cent(er|re)/i, "Venue"],
  [/cater|food|jollof|small chops/i, "Catering"],
  [/photo|video/i, "Photo & video"],
  [/decor|flower/i, "Decor"],
  [/\bdj\b|band|music/i, "DJ & band"],
  [/\bmc\b|compere/i, "MC"],
  [/cake/i, "Cake"],
  [/make ?up|gele/i, "Makeup & gele"],
];

function secondSaturday(year: number, month: number) {
  const d = new Date(Date.UTC(year, month, 1, 12));
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function fallbackPatch(text: string, plan: Plan): PlanPatch {
  const t = wordsToDigits(" " + text + " ");
  const facts: PlanPatch["facts"] = {};
  const said: string[] = [];

  const mil = t.match(/(\d+(?:\.\d+)?)\s*(million|mill?|m)\b/i);
  const big = t.match(/₦?\s?(\d{1,3}(?:,\d{3}){2,})/);
  const k = t.match(/(\d+(?:\.\d+)?)\s*(k|thousand)\b(?!\s*guests)/i);
  if (mil) facts.budget = parseFloat(mil[1]) * 1_000_000;
  else if (big) facts.budget = parseInt(big[1].replace(/,/g, ""), 10);
  else if (k && /budget|naira|₦/i.test(t)) facts.budget = parseFloat(k[1]) * 1000;
  if (facts.budget) said.push(`a budget of ${nairaSpoken(facts.budget)}`);

  const g = t.match(/(\d{2,5})\s*(guests|people|persons|heads|invitees)/i);
  if (g) { facts.guests = parseInt(g[1], 10); said.push(`${facts.guests} guests`); }

  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(t));
  if (city) { facts.city = city; said.push(city); }

  const iso = t.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const m = MONTHS.findIndex((mo) => new RegExp(`\\b${mo}\\b`, "i").test(t));
  if (iso) facts.date = iso[1];
  else if (m >= 0) {
    const day = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTHS[m]}|${MONTHS[m]}\\s+(\\d{1,2})\\b`, "i"));
    const today = new Date(todayISO() + "T12:00:00");
    let year = today.getFullYear();
    if (m < today.getMonth()) year += 1;
    const yr = t.match(/\b(20\d{2})\b/);
    if (yr) year = parseInt(yr[1], 10);
    const dd = day ? parseInt(day[1] ?? day[2], 10) : null;
    facts.date = dd
      ? `${year}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
      : secondSaturday(year, m);
    said.push(dd ? prettyDate(facts.date, { day: "numeric", month: "long" }) : `${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} (I've pencilled in Saturday ${prettyDate(facts.date, { day: "numeric", month: "long" })})`);
  }

  const vendors: PlanPatch["vendors"] = [];
  const completeTasks: string[] = [];
  if (/\b(booked|paid|confirmed|sorted|done with)\b/i.test(t)) {
    for (const [re, category] of VENDOR_WORDS) {
      if (re.test(t)) {
        vendors.push({ category, status: "booked", note: "Confirmed by voice" });
        said.push(`${category.toLowerCase()} booked`);
      }
    }
  }
  const done = t.match(/(?:done with|finished|ticked off|completed)\s+(?:the\s+)?([a-z ]{4,40})/i);
  if (done) completeTasks.push(done[1]);

  let reply: string;
  if (said.length) {
    reply = `Got it: ${said.join(", ")}. I've updated the checklist and budget. Tap the briefing any time to hear what's next.`;
  } else if (!plan.tasks.length) {
    reply = "Tell me the budget, the guest count, the city and the month, and I'll lay it all out.";
  } else {
    reply = "I noted that. My planning model is offline right now, so I can only catch budgets, guest counts, dates and bookings.";
  }
  return { reply, facts, vendors, completeTasks };
}
