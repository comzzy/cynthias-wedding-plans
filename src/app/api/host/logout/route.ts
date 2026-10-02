import { NextResponse } from "next/server";
import { cookieOptions, HOST_COOKIE } from "@/lib/hostToken";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(HOST_COOKIE, "", { ...cookieOptions(new URL(req.url).protocol === "https:"), maxAge: 0 });
  return res;
}
