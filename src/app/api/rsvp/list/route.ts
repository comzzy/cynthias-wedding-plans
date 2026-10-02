import { NextResponse } from "next/server";
import { hostAllowed } from "@/lib/host";
import { listRsvps } from "@/lib/store";
import { latestPerGuest, totals } from "@/lib/guests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hostAllowed(new URL(req.url).searchParams.get("key"))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const rsvps = latestPerGuest(await listRsvps());
  return NextResponse.json({ rsvps, totals: totals(rsvps) });
}
