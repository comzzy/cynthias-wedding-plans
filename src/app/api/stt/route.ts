import { NextResponse } from "next/server";
import { MAX_AUDIO_BYTES, transcribe } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: "Voice is not set up yet (ELEVENLABS_API_KEY missing)." }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: "No audio received." }, { status: 400 });
  if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "That recording is too long." }, { status: 413 });
  try {
    return NextResponse.json(await transcribe(audio));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
