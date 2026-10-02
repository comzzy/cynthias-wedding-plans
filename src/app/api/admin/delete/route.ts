import { NextResponse } from "next/server";
import { isHost } from "@/lib/host";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Host-only: permanently delete specific RSVPs and wishes (with their recordings) by id.
 * Needs Cynthia's sign-in cookie. Body: { rsvps?: string[], wishes?: string[] }. Only listed ids are touched; there is no "delete all".
 */
export async function POST(req: Request) {
  if (!(await isHost())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { rsvps?: unknown; wishes?: unknown };
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const rsvps = ids(body.rsvps), wishes = ids(body.wishes);
  if (rsvps.length + wishes.length === 0 || rsvps.length + wishes.length > 100) {
    return NextResponse.json({ error: "Send between 1 and 100 ids." }, { status: 400 });
  }
  const store = getStore();
  const deleted = { rsvps: 0, wishes: 0 };
  for (const id of rsvps) if (await store.deleteRecord("rsvps", id)) deleted.rsvps++;
  for (const id of wishes) if (await store.deleteRecord("wishes", id)) deleted.wishes++;
  return NextResponse.json({ ok: true, deleted });
}
