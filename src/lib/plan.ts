import type { BudgetLine, Plan, PlanPatch, Task, TimelineItem, Vendor, VendorStatus } from "./types";
import { daysUntil, nairaSpoken, prettyDate, todayISO } from "./format";

const uid = () => Math.random().toString(36).slice(2, 10);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clean = (s: unknown, max = 120) =>
  typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "";
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** A typical split for a Nigerian white wedding + reception (percent of total). */
export const DEFAULT_SPLIT: [string, number][] = [
  ["Catering & drinks", 28],
  ["Venue & hall", 15],
  ["Decor & flowers", 12],
  ["Attire & family outfits", 10],
  ["Photo & video", 8],
  ["Traditional engagement", 8],
  ["MC, DJ & live band", 6],
  ["Contingency", 6],
  ["Souvenirs & stationery", 4],
  ["Cake", 3],
];

export const defaultBudget = (total: number): BudgetLine[] =>
  DEFAULT_SPLIT.map(([category, pct]) => ({ category, amount: roundTo((total * pct) / 100, 10_000) }));

const roundTo = (n: number, step: number) => Math.max(0, Math.round(n / step) * step);

/** Checklist template: [title, category, days before the wedding] */
const TEMPLATE: [string, string, number][] = [
  ["Agree the guest numbers with both families", "Guests", 180],
  ["Book the reception venue", "Venue", 170],
  ["Book the photographer and videographer", "Photo & video", 150],
  ["Choose the caterer and book a tasting", "Catering", 140],
  ["Pick the matching family outfit fabric (aso-ebi) and colours", "Attire", 120],
  ["Book the decorator", "Decor", 115],
  ["Book the MC and DJ or live band", "Entertainment", 110],
  ["Start the wedding dress and fittings", "Attire", 100],
  ["Send invitations and the RSVP link", "Guests", 75],
  ["Book makeup and gele artist", "Beauty", 70],
  ["Confirm the traditional engagement list with both families", "Traditional", 60],
  ["Order the cake", "Cake", 50],
  ["Order souvenirs", "Souvenirs", 45],
  ["Final dress fitting", "Attire", 21],
  ["Confirm final headcount with the caterer", "Catering", 14],
  ["Pay vendor balances", "Budget", 10],
  ["Share the day-of timeline with vendors and the MC", "Timeline", 7],
  ["Prepare envelopes: vendor tips and spraying money", "Budget", 3],
];

export const DEFAULT_TIMELINE: TimelineItem[] = [
  { time: "07:30", item: "Makeup and gele" },
  { time: "10:00", item: "Church ceremony" },
  { time: "12:30", item: "Couple and family photos" },
  { time: "14:00", item: "Guests seated, small chops served" },
  { time: "14:45", item: "Grand entrance of the couple" },
  { time: "15:15", item: "Toasts and cake cutting" },
  { time: "15:45", item: "Lunch is served" },
  { time: "16:45", item: "First dance and spraying" },
  { time: "18:00", item: "Thank-yous and send-off" },
];

const addDays = (iso: string, d: number) => {
  const t = new Date(iso + "T12:00:00");
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

export function scaffoldTasks(date: string | null): Task[] {
  const today = todayISO();
  // If the wedding is sooner than the usual six-month runway, compress the schedule proportionally.
  const runway = date ? Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000) - 2 : 0;
  const longest = TEMPLATE[0][2];
  const scale = date && runway < longest ? Math.max(runway, 1) / longest : 1;
  return TEMPLATE.map(([title, category, before]) => {
    let due: string | null = null;
    if (date) {
      due = addDays(date, -Math.max(1, Math.round(before * scale)));
      if (due <= today) due = addDays(today, 1);
    }
    return { id: uid(), title, category, due, done: false };
  });
}

const STATUSES: VendorStatus[] = ["to find", "contacted", "quoted", "booked"];

/** Merge a (possibly sloppy) model patch into the plan, defensively. */
export function applyPatch(plan: Plan, patch: PlanPatch): Plan {
  const next: Plan = structuredClone(plan);
  const f = patch.facts ?? {};

  const budget = Number(f.budget);
  if (Number.isFinite(budget) && budget >= 10_000) next.facts.budget = Math.round(budget);
  const guests = Number(f.guests);
  if (Number.isFinite(guests) && guests > 0 && guests < 20_000) next.facts.guests = Math.round(guests);
  if (clean(f.city)) next.facts.city = clean(f.city, 40);
  if (typeof f.date === "string" && ISO.test(f.date) && !isNaN(Date.parse(f.date)) && f.date > todayISO()) next.facts.date = f.date;
  if (clean(f.style)) next.facts.style = clean(f.style, 160);

  // Tasks
  const have = new Set(next.tasks.map((t) => key(t.title)));
  for (const t of patch.addTasks ?? []) {
    const title = clean(t?.title);
    if (!title || have.has(key(title))) continue;
    have.add(key(title));
    next.tasks.push({
      id: uid(),
      title,
      due: typeof t.due === "string" && ISO.test(t.due) ? t.due : null,
      category: clean(t.category, 30) || "Other",
      done: false,
    });
  }
  for (const c of patch.completeTasks ?? []) {
    const k = key(clean(c));
    if (!k) continue;
    const hit = next.tasks.find((t) => !t.done && (key(t.title).includes(k) || k.includes(key(t.title))));
    if (hit) hit.done = true;
  }

  // Budget: accept a full split, scale it to the total so the numbers always add up
  const lines = (patch.budget ?? [])
    .map((b) => ({ category: clean(b?.category, 40), amount: Number(b?.amount) }))
    .filter((b) => b.category && Number.isFinite(b.amount) && b.amount > 0);
  if (lines.length >= 3) {
    const total = next.facts.budget;
    const sum = lines.reduce((a, b) => a + b.amount, 0);
    next.budget = lines.map((b) => ({
      category: b.category,
      amount: total ? roundTo((b.amount / sum) * total, 10_000) : Math.round(b.amount),
    }));
  }

  // Timeline: replace when the model gives a real one
  const tl = (patch.timeline ?? [])
    .map((t) => ({ time: clean(t?.time, 12), item: clean(t?.item, 80) }))
    .filter((t) => t.time && t.item);
  if (tl.length >= 3) next.timeline = tl;

  // Vendors: upsert by category (+ name)
  for (const v of patch.vendors ?? []) {
    const category = clean(v?.category, 40);
    if (!category) continue;
    const name = clean(v?.name, 60);
    const status = (STATUSES.includes(v?.status as VendorStatus) ? v.status : "to find") as VendorStatus;
    const note = clean(v?.note, 140);
    const existing = next.vendors.find(
      (x) => key(x.category) === key(category) && (!name || !x.name || key(x.name) === key(name)),
    );
    if (existing) {
      if (name) existing.name = name;
      existing.status = status;
      if (note) existing.note = note;
    } else {
      next.vendors.push({ id: uid(), category, name, status, note } satisfies Vendor);
    }
    if (status === "booked") {
      const k = key(category).split(" ")[0];
      const t = next.tasks.find((t) => !t.done && key(t.title).startsWith("book") && key(t.title).includes(k));
      if (t) t.done = true;
    }
  }

  return ensureBaseline(next);
}

/** Make sure a sensible scaffold exists once we know the basics. */
export function ensureBaseline(plan: Plan): Plan {
  const p = plan;
  const known = p.facts.budget || p.facts.guests || p.facts.date;
  if (!known) return p;
  if (p.facts.budget && p.budget.length === 0) p.budget = defaultBudget(p.facts.budget);
  if (p.facts.budget && p.budget.length) {
    // Re-scale if the total changed
    const sum = p.budget.reduce((a, b) => a + b.amount, 0);
    if (sum > 0 && Math.abs(sum - p.facts.budget) / p.facts.budget > 0.02) {
      p.budget = p.budget.map((b) => ({ ...b, amount: roundTo((b.amount / sum) * p.facts.budget!, 10_000) }));
    }
  }
  const templated = p.tasks.filter((t) => TEMPLATE.some(([title]) => title === t.title)).length;
  if (templated === 0) p.tasks = [...scaffoldTasks(p.facts.date), ...p.tasks];
  else if (p.facts.date) {
    // Date arrived later: give undated template tasks proper due dates
    const fresh = scaffoldTasks(p.facts.date);
    for (const t of p.tasks) if (!t.due) t.due = fresh.find((f) => f.title === t.title)?.due ?? null;
  }
  if (p.timeline.length === 0) p.timeline = [...DEFAULT_TIMELINE];
  p.updatedAt = new Date().toISOString();
  return p;
}

export function upcoming(plan: Plan, n = 3): Task[] {
  return plan.tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, n);
}

/** Plain, factual briefing used directly as a fallback and as grounding for the model. */
export function briefingFacts(plan: Plan): string {
  if (!plan.tasks.length) {
    return "We haven't started yet. Tell me the budget, how many guests, the city and the month, and I'll set everything up.";
  }
  const parts: string[] = [];
  const d = daysUntil(plan.facts.date);
  if (d !== null && d >= 0) parts.push(`${d} days to the wedding.`);
  const today = todayISO();
  const overdue = plan.tasks.filter((t) => !t.done && t.due && t.due < today).length;
  if (overdue) parts.push(`${overdue} ${overdue === 1 ? "task is" : "tasks are"} overdue.`);
  const next = upcoming(plan, 3);
  if (next.length) {
    parts.push(
      "Next up: " +
        next.map((t) => `${t.title.toLowerCase()}${t.due ? `, by ${prettyDate(t.due, { day: "numeric", month: "long" })}` : ""}`).join("; ") +
        ".",
    );
  } else parts.push("Every task is ticked off. Well done.");
  if (plan.facts.budget) parts.push(`The budget is ${nairaSpoken(plan.facts.budget)}.`);
  const booked = plan.vendors.filter((v) => v.status === "booked").length;
  if (plan.vendors.length) parts.push(`${booked} of ${plan.vendors.length} vendors booked.`);
  return parts.join(" ");
}

export function summariseForModel(plan: Plan): string {
  const f = plan.facts;
  const lines = [
    `Facts: budget=${f.budget ?? "unknown"} NGN, guests=${f.guests ?? "unknown"}, city=${f.city ?? "unknown"}, date=${f.date ?? "unknown"}, style=${f.style ?? "none"}`,
    `Open tasks: ${upcoming(plan, 8).map((t) => `${t.title} (due ${t.due ?? "?"})`).join("; ") || "none"}`,
    `Done: ${plan.tasks.filter((t) => t.done).map((t) => t.title).slice(0, 8).join("; ") || "none"}`,
    `Budget split: ${plan.budget.map((b) => `${b.category} ${b.amount}`).join("; ") || "none"}`,
    `Vendors: ${plan.vendors.map((v) => `${v.category}${v.name ? " " + v.name : ""} [${v.status}]`).join("; ") || "none"}`,
  ];
  return lines.join("\n");
}
