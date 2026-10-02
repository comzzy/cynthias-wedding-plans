import "server-only";
import { cookies } from "next/headers";
import { HOST_COOKIE, hostKeyConfigured, verifyToken } from "./hostToken";

/**
 * Is this request from Cynthia? True when her signed sign-in cookie is valid.
 * Locally, with no RSVP_HOST_KEY set, the private views stay open so development is easy.
 * On Vercel, with no key set, they stay locked.
 */
export async function isHost(): Promise<boolean> {
  if (!hostKeyConfigured()) return !process.env.VERCEL;
  return verifyToken((await cookies()).get(HOST_COOKIE)?.value);
}
