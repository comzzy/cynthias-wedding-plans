import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // ~8 MB, plenty for a 60s voice note

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: "Voice is not set up yet (ELEVENLABS_API_KEY missing)." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "That recording is too long." }, { status: 413 });

  const body = new FormData();
  const type = audio.type || "audio/webm";
  const ext = type.includes("mpeg") || type.includes("mp3") ? "mp3" : type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  body.append("file", audio, `voice.${ext}`);
  body.append("model_id", process.env.ELEVENLABS_STT_MODEL || "scribe_v1");
  body.append("tag_audio_events", "false");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error("ElevenLabs STT failed", res.status, detail);
    return NextResponse.json({ error: "I couldn't hear that clearly. Try again?" }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json({ text: String(data?.text ?? "").trim(), language: data?.language_code ?? null });
}
