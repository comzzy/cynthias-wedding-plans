import { NextResponse } from "next/server";
import { llmConfig, llmReachable } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = llmConfig();
  return NextResponse.json({
    llm: { provider: cfg.provider, model: cfg.model, keySet: Boolean(cfg.apiKey), reachable: await llmReachable() },
    voice: { ready: Boolean(process.env.ELEVENLABS_API_KEY) },
  });
}
