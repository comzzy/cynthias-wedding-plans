/**
 * Cynthia's sign-in. The password is RSVP_HOST_KEY; the browser only ever holds a signed token
 * (expiry + HMAC-SHA256 keyed with RSVP_HOST_KEY) in an httpOnly cookie, never the key itself.
 * Uses Web Crypto so it runs in both middleware and route handlers.
 */
export const HOST_COOKIE = "cwp_host";
export const HOST_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}

/** Constant-time compare of two strings (compares fixed-length digests, so length leaks nothing). */
export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([hmac("cwp-compare", a), hmac("cwp-compare", b)]);
  let r = 0;
  for (let i = 0; i < x.length; i++) r |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return r === 0 && x.length === y.length;
}

export const hostKeyConfigured = () => Boolean(process.env.RSVP_HOST_KEY);

export async function checkPassword(pw: unknown) {
  const want = process.env.RSVP_HOST_KEY;
  if (!want || typeof pw !== "string" || !pw) return false;
  return safeEqual(pw.trim(), want);
}

export async function makeToken() {
  const exp = Math.floor(Date.now() / 1000) + HOST_MAX_AGE;
  return `${exp}.${await hmac(process.env.RSVP_HOST_KEY!, `cwp-host|${exp}`)}`;
}

export async function verifyToken(token: string | undefined | null) {
  const want = process.env.RSVP_HOST_KEY;
  if (!want || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(want, `cwp-host|${exp}`));
}

export const cookieOptions = (secure: boolean) => ({
  httpOnly: true, secure, sameSite: "strict" as const, path: "/", maxAge: HOST_MAX_AGE,
});

/** Small delay so guessing is slow. */
export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
