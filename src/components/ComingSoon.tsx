import Link from "next/link";
import Nav from "./Nav";
import Flourish from "./Flourish";
import { ArchReveal, Bloom, Reveal } from "./Reveal";
import { BouquetBottomRight } from "./Botanicals";

export default function ComingSoon({ numeral, title, script, body, points }: { numeral: string; title: string; script: string; body: string; points: string[] }) {
  return (
    <main>
      <Nav />
      <section className="mx-auto flex max-w-6xl justify-center px-5 pb-24 pt-6 sm:px-8">
        <div className="relative w-full max-w-[520px]">
          <Bloom className="pointer-events-none absolute -bottom-[8%] -right-[16%] z-20 w-[55%] sm:-right-[30%] sm:w-[62%]" delay={0.6} from="right">
            <BouquetBottomRight id={`cs-${numeral}`} className="h-auto w-full" />
          </Bloom>
          <ArchReveal className="relative z-10">
            <div className="arch px-7 pb-20 pt-28 text-center sm:px-12 sm:pt-32">
              <Reveal delay={0.8}><p className="caps text-[0.62rem] text-cocoa-soft">Part {numeral} · coming soon</p></Reveal>
              <Reveal delay={1}>
                <h1 className="mt-4 font-display text-4xl tracking-[0.12em] text-cocoa sm:text-5xl">{title.toUpperCase()}</h1>
                <p className="mt-2 font-script text-4xl text-rosegold-deep sm:text-5xl">{script}</p>
              </Reveal>
              <Reveal delay={1.2}><Flourish className="mt-6" /></Reveal>
              <Reveal delay={1.35}><p className="mx-auto mt-6 max-w-sm font-display text-xl leading-snug text-cocoa-soft">{body}</p></Reveal>
              <Reveal delay={1.5}>
                <ul className="mx-auto mt-8 max-w-xs space-y-3 text-left">
                  {points.map((p) => (
                    <li key={p} className="flex gap-3 text-[0.95rem] font-light text-cocoa-soft">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-rosegold" />{p}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={1.7}>
                <Link href="/planner" className="btn-gold caps mt-10 inline-block rounded-full px-7 py-3 text-[0.65rem]">Back to the planner</Link>
              </Reveal>
            </div>
          </ArchReveal>
        </div>
      </section>
    </main>
  );
}
