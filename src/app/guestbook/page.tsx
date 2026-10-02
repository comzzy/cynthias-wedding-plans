import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Guestbook from "@/components/Guestbook";
import { listWishes } from "@/lib/store";
import { hostAllowed } from "@/lib/host";
import type { Wish } from "@/lib/guests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Guestbook · Cynthia's Wedding Plans",
  description: "Leave the couple a wish in your own voice.",
};

export default async function GuestbookPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  // Hide controls only appear for Cynthia, and only when a host key is configured.
  const host = Boolean(key) && Boolean(process.env.RSVP_HOST_KEY) && hostAllowed(key);
  const wishes = (await listWishes()).filter((w) => !(w as Wish & { hidden?: boolean }).hidden);
  return (
    <main>
      <Nav />
      <Guestbook initial={wishes} hostKey={host ? key! : null} />
    </main>
  );
}
