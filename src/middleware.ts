import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, cookieOptions, HOST_COOKIE, makeToken, pause } from "@/lib/hostToken";

/**
 * Old links like /rsvp/list?key=… still work, once: a correct key signs Cynthia in (cookie)
 * and every visit is redirected to the clean address, so the key never stays in the address bar.
 */
export async function middleware(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key === null) return NextResponse.next();
  const clean = req.nextUrl.clone();
  clean.searchParams.delete("key");
  const res = NextResponse.redirect(clean, 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  if (await checkPassword(key)) res.cookies.set(HOST_COOKIE, await makeToken(), cookieOptions(req.nextUrl.protocol === "https:"));
  else await pause(900);
  return res;
}

export const config = { matcher: ["/rsvp/list", "/guestbook"] };
