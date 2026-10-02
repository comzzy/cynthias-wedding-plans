import { NextResponse } from "next/server";
import { transcribe } from "@/lib/elevenlabs";
import { tagWish } from "@/lib/guestAI";
import { listWishes, newId, saveWish, getStore } from "@/lib/store";
import type { Wish } from "@/lib/guests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_WISH_BYTES = 3 * 1024 * 1024; // ~60s of opus is well under 1 MB

export async function GET() {
  const wishes = (await listWishes()).filter((w) => !(w as Wish & { hidden?: boolean }).hidden);
  return NextResponse.json({ wishes });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Nothing received." }, { status: 400 });
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || "A friend";
  const audio = form.get("audio");
  const durationSec = Math.min(60, Math.max(0, Math.round(Number(form.get("duration")) || 0))) || null;
  let text = String(form.get("text") ?? "").trim().slice(0, 1500);
  let hasAudio = false;

  if (audio instanceof Blob && audio.size > 0) {
    if (audio.size > MAX_WISH_BYTES) return NextResponse.json({ error: "That one's a bit long. Keep it under a minute." }, { status: 413 });
    try {
      text = (await transcribe(audio)).text;
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
    if (!text) return NextResponse.json({ error: "We couldn't hear any words. Try again a little closer to the mic?" }, { status: 422 });
    hasAudio = true;
  }
  if (text.length < 3) return NextResponse.json({ error: "Say or write a few words for the couple." }, { status: 400 });

  const tagged = await tagWish(text);
  const id = newId();
  const wish: Wish = {
    id, name, theme: tagged.theme, title: tagged.title, text: tagged.text,
    audio: hasAudio, durationSec: hasAudio ? durationSec : null, createdAt: new Date().toISOString(),
  };
  try {
    if (hasAudio) await getStore().putAudio(id, await (audio as Blob).arrayBuffer(), (audio as Blob).type || "audio/webm");
    await saveWish(wish);
  } catch (e) {
    console.error("wish save failed", (e as Error).message);
    return NextResponse.json({ error: "We couldn't save your wish just now. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ wish, source: tagged.source });
}
