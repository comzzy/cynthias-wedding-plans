import "server-only";

/**
 * Cynthia's private views (guest list, hiding wishes) need ?key=RSVP_HOST_KEY.
 * Locally, with no key set, they are open so development stays easy.
 * On Vercel, with no key set, they stay locked.
 */
export function hostAllowed(key: string | null | undefined): boolean {
  const want = process.env.RSVP_HOST_KEY;
  if (!want) return !process.env.VERCEL;
  return typeof key === "string" && key.length > 0 && timingSafeEqual(key, want);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
