import { NextResponse } from "next/server";
import { briefingWithModel, llmConfig, planWithModel } from "@/lib/llm";
import { applyPatch, briefingFacts, ensureBaseline, migratePlan } from "@/lib/plan";
import { fallbackPatch } from "@/lib/fallback";
import { emptyPlan, type ChatTurn, type Plan, type PlanResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    plan?: Plan;
    history?: ChatTurn[];
    mode?: "chat" | "briefing";
  };
  const plan: Plan = migratePlan(body.plan && typeof body.plan === "object" ? { ...emptyPlan(), ...body.plan } : emptyPlan());
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const cfg = llmConfig();
  const label = `${cfg.model} via ${cfg.provider}`;

  if (body.mode === "briefing") {
    const facts = briefingFacts(plan);
    try {
      const reply = plan.tasks.length ? await briefingWithModel(plan) : facts;
      return NextResponse.json({ reply, plan, source: "llm", model: label } satisfies PlanResponse);
    } catch (e) {
      console.warn("briefing: model unavailable, using facts", (e as Error).message);
      return NextResponse.json({ reply: facts, plan, source: "fallback", model: null } satisfies PlanResponse);
    }
  }

  const message = String(body.message ?? "").trim().slice(0, 1200);
  if (!message) return NextResponse.json({ error: "Say something first." }, { status: 400 });

  try {
    const patch = await planWithModel(message, plan, history);
    // Small local models sometimes miss obvious numbers; let the rules fill gaps the model left empty.
    const rules = fallbackPatch(message, plan);
    patch.facts = { ...rules.facts, ...Object.fromEntries(Object.entries(patch.facts ?? {}).filter(([, v]) => v != null && v !== "")) };
    // If she clearly named a month and the model picked a different one, trust her words.
    if (rules.facts?.date && patch.facts.date && String(patch.facts.date).slice(0, 7) !== rules.facts.date.slice(0, 7)) {
      patch.facts.date = rules.facts.date;
    }
    const next = applyPatch(plan, patch);
    return NextResponse.json({ reply: patch.reply, plan: next, source: "llm", model: label } satisfies PlanResponse);
  } catch (e) {
    console.warn("plan: model unavailable, using offline helper:", (e as Error).message);
    const patch = fallbackPatch(message, plan);
    const next = ensureBaseline(applyPatch(plan, patch));
    return NextResponse.json({
      reply: patch.reply,
      plan: next,
      source: "fallback",
      model: null,
      notice: `No open model reachable at ${cfg.provider}. Using the offline helper.`,
    } satisfies PlanResponse);
  }
}
