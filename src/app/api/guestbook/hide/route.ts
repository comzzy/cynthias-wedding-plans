import { NextResponse } from "next/server";
import { isHost } from "@/lib/host";
import { listWishes, saveWish } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cynthia can hide a wish from the keepsake page (it is kept, just not shown). */
export async function POST(req: Request) {
  if (!(await isHost())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id, hidden = true } = (await req.json().catch(() => ({}))) as { id?: string; hidden?: boolean };
  const w = (await listWishes()).find((x) => x.id === id);
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await saveWish({ ...w, hidden } as typeof w);
  return NextResponse.json({ ok: true });
}
