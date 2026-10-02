import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Guestbook from "@/components/Guestbook";
import { listWishes } from "@/lib/store";
import { isHost } from "@/lib/host";
import { hostKeyConfigured } from "@/lib/hostToken";
import type { Wish } from "@/lib/guests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Guestbook · Cynthia's Wedding Plans",
  description: "Leave the couple a wish in your own voice.",
};

export default async function GuestbookPage() {
  // Hide controls only appear for Cynthia (signed in), and only when a host key is configured.
  const host = hostKeyConfigured() && (await isHost());
  const wishes = (await listWishes()).filter((w) => !(w as Wish & { hidden?: boolean }).hidden);
  return (
    <main>
      <Nav />
      <Guestbook initial={wishes} host={host} />
    </main>
  );
}
