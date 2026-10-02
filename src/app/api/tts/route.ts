export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Sarah - Mature, Reassuring, Confident" (premade). Override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";
const MAX_CHARS = 420; // keeps every reply short and the credits safe

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "Voice is not set up yet." }, { status: 503 });

  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const clean = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  if (!clean) return Response.json({ error: "Nothing to say." }, { status: 400 });

  const voice = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: clean,
        model_id: process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5",
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!res.ok || !res.body) {
    console.error("ElevenLabs TTS failed", res.status, (await res.text()).slice(0, 300));
    return Response.json({ error: "My voice isn't working right now." }, { status: 502 });
  }
  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
