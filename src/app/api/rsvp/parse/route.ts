import { NextResponse } from "next/server";
import { parseRsvp } from "@/lib/guestAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const t = String(text ?? "").trim().slice(0, 1500);
  if (t.length < 3) return NextResponse.json({ error: "Tell us a little more: your name and whether you're coming." }, { status: 400 });
  return NextResponse.json(await parseRsvp(t));
}
