import "server-only";
import type { ChatTurn, Plan, PlanPatch } from "./types";
import { briefingFacts, summariseForModel } from "./plan";
import { todayISO } from "./format";

export type LlmConfig = { baseUrl: string; apiKey: string | null; model: string; provider: string; backupModel: string | null };

export function llmConfig(): LlmConfig {
  // Default: Groq (hosted open-weight models). Set LLM_BASE_URL=http://localhost:11434/v1 for Ollama on a laptop.
  const baseUrl = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const provider = baseUrl.includes("groq.com")
    ? "Groq"
    : baseUrl.includes("openrouter.ai")
      ? "OpenRouter"
      : baseUrl.includes("11434")
        ? "Ollama"
        : "OpenAI-compatible";
  const fallbackModel =
    provider === "Groq" ? "openai/gpt-oss-120b" : provider === "OpenRouter" ? "google/gemma-3-27b-it" : "gemma3:1b";
  return { baseUrl, apiKey: process.env.LLM_API_KEY || (provider === "Groq" ? process.env.GROQ_API_KEY : undefined) || null, model: process.env.LLM_MODEL || fallbackModel, provider,
    backupModel: process.env.LLM_FALLBACK_MODEL || (provider === "Groq" ? "openai/gpt-oss-20b" : null) };
}

const SYSTEM = `You are the planner inside "Cynthia's Wedding Plans", a voice wedding planner for Cynthia, a bride in Nigeria.
You speak like a calm, warm, organised friend who knows Nigerian weddings (traditional engagement, white wedding, aso-ebi, small chops, MC, spraying).
Money is always Nigerian naira (NGN). Today is {TODAY}.
Calendar of upcoming Saturdays (use these when you pencil in a date): {SATURDAYS}

Read the current plan and Cynthia's latest message, then return ONLY a JSON object with these keys:
{
  "reply": "what you say back, spoken aloud: 1-3 short sentences, under 45 words, no lists, no emojis, no markdown",
  "facts": {"budget": number|null, "guests": number|null, "city": string|null, "date": "YYYY-MM-DD"|null, "style": string|null},
  "addTasks": [{"title": "short task", "due": "YYYY-MM-DD", "category": "Venue|Catering|Attire|Guests|Decor|Photo & video|Entertainment|Traditional|Budget|Other"}],
  "completeTasks": ["title of a task she says is done"],
  "budget": [{"category": "name", "amount": number}],
  "timeline": [{"time": "HH:MM", "item": "what happens"}],
  "vendors": [{"category": "e.g. Catering", "name": "vendor name or empty", "status": "to find|contacted|quoted|booked", "note": "short note"}]
}
Rules:
- Only include facts she actually said or clearly changed; use null otherwise. "5 million" means 5000000. If she names only a month, pick a Saturday in that month on or after today.
- addTasks: only NEW tasks her message implies (not ones already in the plan). Due dates must be after today and before the wedding.
- budget: only when she asks to change the split or gives amounts; otherwise []. Amounts should add up to the total budget.
- timeline: only when she talks about the order of the day; otherwise [].
- vendors: when she mentions a vendor, quote, booking or contact.
- The reply first confirms what you understood or changed in plain words (say the date you pencilled in, if you chose one), then gives one useful tip or asks for ONE missing thing (budget, guests, city, date, colours) at most.
- Say money the way people speak it, e.g. "5 million naira" or "1.4 million naira"; never write NGN or long digits in the reply.
- Never read out long lists. Never mention JSON, the app or being an AI.`;

const BRIEFING = `You are the planner inside "Cynthia's Wedding Plans". Turn these facts into a warm spoken morning briefing for Cynthia, a bride in Nigeria.
Return ONLY JSON: {"reply": "2-3 short sentences, under 50 words, no lists, no emojis"}. Keep every number and date exactly as given. Do not invent tasks.`;

function todayLong() {
  const d = new Date();
  return `${d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Africa/Lagos" })} ${todayISO()}`;
}

/** Models are bad at weekdays; hand them the real Saturdays for the next 14 months. */
function saturdays() {
  const d = new Date(todayISO() + "T12:00:00Z");
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  const byMonth = new Map<string, number[]>();
  for (let i = 0; i < 61; i++) {
    const k = d.toISOString().slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), d.getUTCDate()]);
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return [...byMonth].map(([k, days]) => `${k}: ${days.join(", ")}`).join("; ");
}

function extractJson(s: string): unknown {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON in model output");
  return JSON.parse(s.slice(start, end + 1));
}

/** Try the main model; if it is slow or failing, retry once on the smaller backup model. */
async function chat(cfg: LlmConfig, messages: { role: string; content: string }[]): Promise<unknown> {
  const local = cfg.provider === "Ollama";
  try {
    return await chatOnce(cfg, cfg.model, messages, local ? 90_000 : 15_000);
  } catch (e) {
    if (!cfg.backupModel || cfg.backupModel === cfg.model) throw e;
    console.warn(`LLM ${cfg.model} failed (${(e as Error).message}); retrying on ${cfg.backupModel}`);
    return chatOnce(cfg, cfg.backupModel, messages, 15_000);
  }
}

async function chatOnce(cfg: LlmConfig, model: string, messages: { role: string; content: string }[], timeoutMs: number) {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      ...(cfg.provider === "OpenRouter" ? { "HTTP-Referer": "https://github.com/", "X-Title": "Cynthia's Wedding Plans" } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      // gpt-oss models think before answering; keep it brief so voice replies stay snappy
      ...(/gpt-oss/.test(model) ? { reasoning_effort: "low" } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return extractJson(content);
}

export async function planWithModel(message: string, plan: Plan, history: ChatTurn[]): Promise<PlanPatch> {
  const cfg = llmConfig();
  const out = (await chat(cfg, [
    { role: "system", content: SYSTEM.replace("{TODAY}", todayLong()).replace("{SATURDAYS}", saturdays()) },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: `CURRENT PLAN\n${summariseForModel(plan)}\n\nCYNTHIA SAYS\n${message}` },
  ])) as PlanPatch;
  if (!out || typeof out.reply !== "string" || !out.reply.trim()) throw new Error("model returned no reply");
  out.reply = out.reply.replace(/[*_#`]/g, "").slice(0, 400);
  return out;
}

export async function briefingWithModel(plan: Plan): Promise<string> {
  const cfg = llmConfig();
  const out = (await chat(cfg, [
    { role: "system", content: BRIEFING },
    { role: "user", content: `Today is ${todayISO()}. Facts: ${briefingFacts(plan)}` },
  ])) as { reply?: string };
  if (!out?.reply) throw new Error("model returned no briefing");
  return out.reply.replace(/[*_#`]/g, "").slice(0, 400);
}

export async function llmReachable(): Promise<boolean> {
  const cfg = llmConfig();
  try {
    const r = await fetch(`${cfg.baseUrl}/models`, {
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}
