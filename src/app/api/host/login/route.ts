import { NextResponse } from "next/server";
import { checkPassword, cookieOptions, HOST_COOKIE, makeToken, pause } from "@/lib/hostToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic per-instance limit on wrong guesses: 5 per 10 minutes per IP, plus a delay on every miss.
const WINDOW = 10 * 60 * 1000, MAX_FAILS = 5;
const fails = new Map<string, number[]>();
const ipOf = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

export async function POST(req: Request) {
  const ip = ipOf(req);
  const now = Date.now();
  const recent = (fails.get(ip) || []).filter((t) => now - t < WINDOW);
  if (recent.length >= MAX_FAILS) {
    return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (!(await checkPassword(password))) {
    recent.push(now);
    fails.set(ip, recent);
    await pause(900);
    return NextResponse.json({ error: "That's not quite it. Try again?" }, { status: 401 });
  }
  fails.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(HOST_COOKIE, await makeToken(), cookieOptions(new URL(req.url).protocol === "https:"));
  return res;
}
