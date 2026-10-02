import "server-only";

export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

const ext = (type: string) =>
  type.includes("mpeg") || type.includes("mp3") ? "mp3" : type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";

/** ElevenLabs Scribe speech-to-text. Throws with a friendly message on failure. */
export async function transcribe(audio: Blob): Promise<{ text: string; language: string | null }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Voice is not set up yet.");
  const type = audio.type || "audio/webm";
  const body = new FormData();
  body.append("file", audio, `voice.${ext(type)}`);
  body.append("model_id", process.env.ELEVENLABS_STT_MODEL || "scribe_v1");
  body.append("tag_audio_events", "false");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    console.error("ElevenLabs STT failed", res.status, (await res.text()).slice(0, 300));
    throw new Error("I couldn't hear that clearly. Try again?");
  }
  const data = await res.json();
  return { text: String(data?.text ?? "").trim(), language: data?.language_code ?? null };
}
