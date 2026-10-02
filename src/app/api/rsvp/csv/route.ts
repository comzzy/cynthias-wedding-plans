import { hostAllowed } from "@/lib/host";
import { listRsvps } from "@/lib/store";
import { latestPerGuest } from "@/lib/guests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // quote, and neutralise spreadsheet formulas
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!hostAllowed(new URL(req.url).searchParams.get("key"))) return new Response("Not allowed", { status: 401 });
  const rows = latestPerGuest(await listRsvps());
  const csv = [
    ["Name", "Attending", "Party size", "Dietary", "Note", "Language", "Received"].map(cell).join(","),
    ...rows.map((r) => [r.name, r.attending ? "Yes" : "No", r.partySize, r.dietary.join("; "), r.note, r.language ?? "", r.createdAt].map(cell).join(",")),
  ].join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="cynthia-guest-list.csv"' },
  });
}
