export type Rsvp = {
  id: string;
  name: string;
  attending: boolean;
  partySize: number; // people including the guest; 0 when not attending
  dietary: string[]; // short tags e.g. "vegetarian", "no pepper"
  note: string;
  language: string | null; // "English", "Pidgin", ...
  transcript: string;
  createdAt: string;
};

export type RsvpDraft = Omit<Rsvp, "id" | "createdAt">;

export const THEMES = ["blessing", "advice", "funny", "memory"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABEL: Record<Theme, { title: string; script: string }> = {
  blessing: { title: "Blessings & prayers", script: "with every blessing" },
  advice: { title: "Advice", script: "for the years ahead" },
  funny: { title: "The funny ones", script: "to make you laugh" },
  memory: { title: "Memories", script: "remember when" },
};

export type Wish = {
  id: string;
  name: string;
  theme: Theme;
  title: string; // 2-6 word heading
  text: string; // what they said
  audio: boolean; // has a recording at /api/audio/{id}
  durationSec: number | null;
  createdAt: string;
};

export const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "guest";

export type RsvpTotals = {
  responses: number;
  attending: number; // RSVPs saying yes
  declined: number;
  headcount: number; // people coming
  dietary: { tag: string; people: number }[];
};

/** Latest RSVP per name wins, so a guest can change their answer. */
export function latestPerGuest(all: Rsvp[]): Rsvp[] {
  const m = new Map<string, Rsvp>();
  for (const r of [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) m.set(slug(r.name), r);
  return [...m.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function totals(rsvps: Rsvp[]): RsvpTotals {
  const yes = rsvps.filter((r) => r.attending);
  const diet = new Map<string, number>();
  for (const r of yes) for (const t of r.dietary) diet.set(t.toLowerCase(), (diet.get(t.toLowerCase()) ?? 0) + 1);
  return {
    responses: rsvps.length,
    attending: yes.length,
    declined: rsvps.length - yes.length,
    headcount: yes.reduce((a, r) => a + Math.max(1, r.partySize), 0),
    dietary: [...diet].map(([tag, people]) => ({ tag, people })).sort((a, b) => b.people - a.people),
  };
}
