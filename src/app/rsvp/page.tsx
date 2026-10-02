import type { Metadata } from "next";
import Nav from "@/components/Nav";
import RsvpFlow from "@/components/RsvpFlow";
import { ArchReveal, Bloom } from "@/components/Reveal";
import { BouquetBottomRight, BouquetTopLeft } from "@/components/Botanicals";

export const metadata: Metadata = {
  title: "RSVP · Cynthia's Wedding Plans",
  description: "Tell Cynthia you're coming. Just say it; English or Pidgin.",
};

export default function RsvpPage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto flex max-w-6xl justify-center px-4 pb-28 pt-4 sm:px-8">
        <div className="relative w-full max-w-[560px]">
          <Bloom className="pointer-events-none absolute -left-[14%] -top-[5%] z-20 w-[46%] sm:-left-[28%] sm:-top-[7%] sm:w-[58%]" delay={0.5}>
            <BouquetTopLeft id="rsvp-tl" className="h-auto w-full" />
          </Bloom>
          <Bloom className="pointer-events-none absolute -bottom-[5%] -right-[14%] z-0 w-[44%] sm:-right-[30%] sm:w-[56%]" delay={0.8} from="right">
            <BouquetBottomRight id="rsvp-br" className="h-auto w-full" />
          </Bloom>
          <ArchReveal className="relative z-10">
            <div className="arch px-5 pb-14 pt-32 sm:px-12 sm:pt-36">
              <RsvpFlow />
            </div>
          </ArchReveal>
        </div>
      </section>
    </main>
  );
}
