import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getStore().getAudio(id);
  if (!a) return new Response("Not found", { status: 404 });
  const body: BodyInit = Buffer.isBuffer(a.body) ? new Uint8Array(a.body) : (a.body as ReadableStream<Uint8Array>);
  return new Response(body, { headers: { "Content-Type": a.contentType, "Cache-Control": "private, max-age=3600" } });
}
