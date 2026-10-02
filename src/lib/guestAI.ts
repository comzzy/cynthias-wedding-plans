import "server-only";
import { chat, llmConfig } from "./llm";
import { THEMES, type RsvpDraft, type Theme } from "./guests";

const clean = (s: unknown, max = 200) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

// ---------- RSVP ----------

const RSVP_SYSTEM = `You read a wedding guest's spoken RSVP for Cynthia's wedding in Nigeria and extract it.
Guests may speak English, Nigerian Pidgin, or a mix (e.g. "I go come" = attending, "I no fit come" = not attending, "me and my wife" = 2 people, "I no dey chop meat" = vegetarian, "Abeg no add pepper for am" = no pepper for them).
Return ONLY JSON:
{"name": string ("" if not said), "attending": true|false|null, "partySize": integer (people coming including the guest; 0 if not attending; 1 if attending and unclear),
 "dietary": [short lowercase tags in English, e.g. "vegetarian", "no pepper", "no pork", "nut allergy", "diabetic", "halal"],
 "note": "their message to the couple, tidied, in their own spirit (keep Pidgin if they used it), max 200 chars, or \\"\\"",
 "language": "English"|"Pidgin"|"Mixed"|other}
Do not invent anything that was not said.`;

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

export function fallbackRsvp(text: string): RsvpDraft {
  const t = text.toLowerCase();
  const nameM = text.match(/(?:my name is|i am|i'm|this is|it's|na me|na)\s+((?:aunty|uncle|mr\.?|mrs\.?|dr\.?|chief)?\s*[A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)/);
  const no = /\b(can'?t|cannot|won'?t|not (?:be )?(?:able|coming|attending)|no fit|i no go|regret|unable|decline)\b/.test(t);
  const yes = /\b(coming|will (?:be there|attend|come)|i go come|we go come|attending|count (?:me|us) in|yes)\b/.test(t);
  let party = 1;
  const n = t.match(/\b(?:we are|we're|we be|party of|coming with)\s+(\d+|one|two|three|four|five|six)\b/);
  if (n) party = Number(n[1]) || WORD_NUM[n[1]] || 1;
  else if (/\b(my (?:wife|husband|partner|fianc[eé]e?|plus one|oko|iyawo)|me and my|plus one)\b/.test(t)) party = 2;
  const kids = t.match(/\b(\d+|one|two|three|four) (?:kids|children|pikin)/);
  if (kids) party += Number(kids[1]) || WORD_NUM[kids[1]] || 0;
  const dietary: string[] = [];
  if (/vegetarian|no (?:dey )?chop meat|don'?t eat meat|no meat/.test(t)) dietary.push("vegetarian");
  if (/vegan/.test(t)) dietary.push("vegan");
  if (/no pepper|no add pepper|pepper no|not spicy|can'?t take pepper|doesn'?t take pepper/.test(t)) dietary.push("no pepper");
  if (/no pork|halal/.test(t)) dietary.push(/halal/.test(t) ? "halal" : "no pork");
  if (/nut|groundnut/.test(t) && /allerg/.test(t)) dietary.push("nut allergy");
  if (/diabet|sugar/.test(t)) dietary.push("diabetic");
  if (/gluten/.test(t)) dietary.push("gluten free");
  const attending = no ? false : yes ? true : true;
  return {
    name: nameM ? nameM[1].trim() : "",
    attending,
    partySize: attending ? party : 0,
    dietary,
    note: "",
    language: /\b(dey|go come|no fit|abeg|wetin|pikin|oga|sha)\b/.test(t) ? "Pidgin" : "English",
    transcript: text,
  };
}

export async function parseRsvp(text: string): Promise<{ draft: RsvpDraft; source: "llm" | "fallback" }> {
  const rules = fallbackRsvp(text);
  try {
    const out = (await chat(llmConfig(), [
      { role: "system", content: RSVP_SYSTEM },
      { role: "user", content: text.slice(0, 1500) },
    ])) as Record<string, unknown>;
    const attending = typeof out.attending === "boolean" ? out.attending : rules.attending;
    let party = Math.round(Number(out.partySize));
    if (!Number.isFinite(party) || party < 0 || party > 20) party = rules.partySize;
    if (attending && party < 1) party = 1;
    if (!attending) party = 0;
    const dietary = Array.isArray(out.dietary)
      ? [...new Set(out.dietary.map((d) => clean(d, 30).toLowerCase()).filter(Boolean))].slice(0, 6)
      : rules.dietary;
    return {
      draft: {
        name: clean(out.name, 60) || rules.name,
        attending,
        partySize: party,
        dietary,
        note: clean(out.note, 240),
        language: clean(out.language, 20) || rules.language,
        transcript: text,
      },
      source: "llm",
    };
  } catch (e) {
    console.warn("rsvp: model unavailable, using rules:", (e as Error).message);
    return { draft: rules, source: "fallback" };
  }
}

export function thankYou(d: { name: string; attending: boolean; partySize: number }) {
  const words = d.name.trim().split(/\s+/);
  const titled = /^(aunty|auntie|uncle|mr\.?|mrs\.?|ms\.?|dr\.?|chief|mama|papa|brother|sister|pastor|engr\.?)$/i.test(words[0] ?? "");
  const first = (titled ? words.slice(0, 2) : words.slice(0, 1)).join(" ");
  if (!d.attending) return `Thank you${first ? `, ${first}` : ""}. We'll miss you, and we'll be thinking of you on the day.`;
  return `Thank you${first ? `, ${first}` : ""}! We've saved ${d.partySize === 1 ? "your seat" : `${d.partySize} seats`}. Cynthia can't wait to celebrate with you.`;
}

// ---------- Guestbook ----------

const WISH_SYSTEM = `You sort spoken wedding guestbook messages for a Nigerian couple into one theme:
"blessing" (prayers, blessings, God, long life, children), "advice" (marriage tips, what to do or avoid),
"funny" (jokes, teasing, playful), "memory" (a story or remembered moment).
Return ONLY JSON: {"theme": "blessing"|"advice"|"funny"|"memory", "title": "a 2-6 word heading in the guest's spirit, no quotes, no emojis",
"text": "the message with filler words (um, uh) and false starts removed, otherwise their exact words, keep Pidgin"}`;

export function fallbackTheme(text: string): Theme {
  const t = text.toLowerCase();
  if (/\b(god|bless|pray|amen|lord|grace|fruitful|long life|almighty)\b/.test(t)) return "blessing";
  if (/\b(haha|lol|joke|funny|laugh|snore|remote|jollof war)\b/.test(t)) return "funny";
  if (/\b(remember|when we|back in|that time|first met|years ago|school)\b/.test(t)) return "memory";
  return "advice";
}

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter(Boolean);
/** True when `b` keeps at least 80% of the words in `a` (a punctuation tidy-up, not a rewrite). */
function sameWords(a: string, b: string) {
  const want = words(a), have = new Set(words(b));
  if (!want.length) return false;
  return want.filter((w) => have.has(w)).length / want.length >= 0.8 && words(b).length <= want.length * 1.25 + 2;
}

/**
 * Tags a wish with a theme and short heading. The guest's words are never rewritten:
 * written wishes keep their exact text; for voice transcripts the model may only fix punctuation.
 */
export async function tagWish(text: string, opts: { spoken?: boolean } = {}): Promise<{ theme: Theme; title: string; text: string; source: "llm" | "fallback" }> {
  try {
    const out = (await chat(llmConfig(), [
      { role: "system", content: WISH_SYSTEM },
      { role: "user", content: text.slice(0, 2000) },
    ])) as Record<string, unknown>;
    const theme = THEMES.includes(out.theme as Theme) ? (out.theme as Theme) : fallbackTheme(text);
    const cleaned = clean(out.text, 1200);
    return {
      theme,
      title: clean(out.title, 60).replace(/^["']|["']$/g, "") || "A wish for you",
      text: opts.spoken && cleaned && sameWords(text, cleaned) ? cleaned : text,
      source: "llm",
    };
  } catch (e) {
    console.warn("wish: model unavailable, using rules:", (e as Error).message);
    return { theme: fallbackTheme(text), title: "A wish for you", text, source: "fallback" };
  }
}
