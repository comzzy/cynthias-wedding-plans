import { NextResponse } from "next/server";
import { newId, saveRsvp } from "@/lib/store";
import { thankYou } from "@/lib/guestAI";
import type { Rsvp } from "@/lib/guests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Partial<Rsvp>;
  const name = s(b.name, 60);
  if (name.length < 2) return NextResponse.json({ error: "Please add your name so Cynthia knows who's coming." }, { status: 400 });
  const attending = b.attending !== false;
  let party = Math.round(Number(b.partySize));
  if (!Number.isFinite(party)) party = 1;
  party = attending ? Math.min(Math.max(party, 1), 20) : 0;
  const rsvp: Rsvp = {
    id: newId(),
    name,
    attending,
    partySize: party,
    dietary: Array.isArray(b.dietary) ? [...new Set(b.dietary.map((d) => s(d, 30).toLowerCase()).filter(Boolean))].slice(0, 6) : [],
    note: s(b.note, 240),
    language: s(b.language, 20) || null,
    transcript: s(b.transcript, 1500),
    createdAt: new Date().toISOString(),
  };
  try {
    await saveRsvp(rsvp);
  } catch (e) {
    console.error("rsvp save failed", (e as Error).message);
    return NextResponse.json({ error: "We couldn't save that just now. Please try again in a moment." }, { status: 500 });
  }
  return NextResponse.json({ rsvp, thankYou: thankYou(rsvp) });
}
