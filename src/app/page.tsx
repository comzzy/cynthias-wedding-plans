import Link from "next/link";
import Nav from "@/components/Nav";
import Flourish from "@/components/Flourish";
import { ArchReveal, Bloom, Reveal } from "@/components/Reveal";
import { BouquetBottomRight, BouquetTopLeft, Sprig } from "@/components/Botanicals";
import fs from "node:fs";
import path from "node:path";
import LetterPlayer from "@/components/LetterPlayer";
import letter from "@/content/letter.json";

// Shown only when the one-time recording exists (scripts/make-letter-audio.mjs).
const LETTER_AUDIO = "/audio/kane-letter.mp3";
const hasLetterAudio = fs.existsSync(path.join(process.cwd(), "public", LETTER_AUDIO));

const PARTS = [
  {
    n: "I",
    title: "The Planner",
    line: "Talk, and the plan writes itself.",
    body: "Say the budget, the guest count, the city and the month. It builds the checklist with due dates, splits the budget, drafts the order of the day and keeps track of every vendor. Then it answers you out loud.",
    href: "/planner",
    live: true,
  },
  {
    n: "II",
    title: "Voice RSVP",
    line: "For the aunties who won't fill a form.",
    body: "Guests open a link and simply say who's coming, how many, and what they can't eat. Every answer lands neatly in Cynthia's guest list.",
    href: "/rsvp",
    live: true,
  },
  {
    n: "III",
    title: "Voice Guestbook",
    line: "Their wishes, in their own voices.",
    body: "Friends and family leave a spoken blessing, a piece of advice or a funny story. It becomes a keepsake page the couple can play back for years.",
    href: "/guestbook",
    live: true,
  },
];

const STEPS = [
  ["You speak", "Tap the mic and talk the way you'd tell your sister. Lagos traffic, the family outfit colours and all."],
  ["It listens", "It catches every word, Nigerian names and all."],
  ["It plans", "It updates the checklist, budget, timeline and vendors."],
  ["It answers", "A voice tells you what changed and what to do next."],
];

export default function Home() {
  return (
    <main>
      <Nav />

      {/* HERO: the arch */}
      <section className="relative mx-auto flex max-w-6xl justify-center px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
        <div className="relative w-full max-w-[560px]">
          <Bloom className="pointer-events-none absolute -left-[16%] -top-[6%] z-20 w-[58%] sm:-left-[30%] sm:-top-[9%] sm:w-[72%]" delay={0.6}>
            <BouquetTopLeft id="hero-tl" className="h-auto w-full drop-shadow-[0_8px_14px_rgba(110,76,68,0.12)]" />
          </Bloom>
          <Bloom className="pointer-events-none absolute -bottom-[9%] -right-[16%] z-20 w-[56%] sm:-bottom-[20%] sm:-right-[36%] sm:w-[68%]" delay={0.9} from="right">
            <BouquetBottomRight id="hero-br" className="h-auto w-full drop-shadow-[0_8px_14px_rgba(110,76,68,0.12)]" />
          </Bloom>

          <ArchReveal className="relative z-10">
            <div className="arch px-7 pb-16 pt-40 text-center sm:px-14 sm:pb-20 sm:pt-36">
              <Reveal delay={0.9}>
                <p className="caps text-[0.68rem] text-cocoa-soft sm:text-xs">A planner that listens</p>
              </Reveal>
              <Reveal delay={1.1}>
                <h1 className="mt-5">
                  <span className="block font-script text-6xl leading-[0.9] text-rosegold-deep sm:text-7xl">Cynthia&rsquo;s</span>
                  <span className="mt-3 block font-display text-[2.6rem] font-medium tracking-[0.14em] text-cocoa sm:text-6xl">WEDDING</span>
                  <span className="block font-display text-[2.6rem] font-medium tracking-[0.14em] text-cocoa sm:text-6xl">PLANS</span>
                </h1>
              </Reveal>
              <Reveal delay={1.35}>
                <Flourish className="mt-6" word="say it" />
              </Reveal>
              <Reveal delay={1.5}>
                <p className="mx-auto mt-6 max-w-sm font-display text-xl leading-snug text-cocoa-soft sm:text-[1.35rem]">
                  Tell it the budget, the guest count, the colour scheme you can&rsquo;t stop thinking about. It keeps the list, the budget and the countdown, and talks back.
                </p>
              </Reveal>
              <Reveal delay={1.7}>
                <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Link href="/planner" className="btn-gold caps rounded-full px-8 py-3.5 text-xs">Open the planner</Link>
                  <a href="#how" className="caps text-[0.7rem] text-cocoa-soft underline decoration-rosegold/50 underline-offset-8 hover:text-cocoa">How it works</a>
                </div>
              </Reveal>
              <Reveal delay={1.9}>
                <p className="caps mt-12 text-[0.6rem] text-taupe">Made by Kane, for Cynthia</p>
              </Reveal>
            </div>
          </ArchReveal>
        </div>
      </section>

      {/* THREE PARTS */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="text-center">
          <p className="caps text-xs text-cocoa-soft">Three small helpers</p>
          <h2 className="mt-3 font-display text-4xl text-cocoa sm:text-5xl">
            One wedding, <span className="font-script text-5xl text-rosegold-deep sm:text-6xl">many voices</span>
          </h2>
          <Flourish className="mt-5" />
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
          {PARTS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.15}>
              <Link href={p.href} className="group block h-full">
                <article className="arch arch-sm relative flex h-full flex-col items-center px-7 pb-9 pt-14 text-center transition-transform duration-500 group-hover:-translate-y-1.5">
                  <Sprig className="h-10 w-20 transition-transform duration-700 group-hover:scale-110" />
                  <span className="mt-2 font-display text-lg italic text-rosegold-deep">{p.n}</span>
                  <h3 className="caps mt-2 text-sm text-cocoa">{p.title}</h3>
                  <p className="mt-3 font-script text-3xl leading-tight text-rosegold-deep">{p.line}</p>
                  <p className="mt-4 text-[0.95rem] font-light leading-relaxed text-cocoa-soft">{p.body}</p>
                  <span className={`caps mt-auto pt-7 text-[0.62rem] ${p.live ? "text-sage-deep" : "text-taupe"}`}>
                    {p.live ? "Open now  →" : "Coming soon"}
                  </span>
                </article>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-5xl scroll-mt-10 px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="text-center">
          <p className="caps text-xs text-cocoa-soft">How it listens</p>
          <h2 className="mt-3 font-display text-4xl text-cocoa sm:text-5xl">From a voice note to a plan</h2>
          <Flourish className="mt-5" />
        </Reveal>
        <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.15}>
              <li className="relative text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border hairline bg-white/40 font-display text-2xl italic text-rosegold-deep">{i + 1}</span>
                <h3 className="caps mt-5 text-xs text-cocoa">{t}</h3>
                <p className="mx-auto mt-3 max-w-[16rem] text-[0.95rem] font-light leading-relaxed text-cocoa-soft">{d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* NOTE */}
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="paper relative mx-auto max-w-2xl rounded-sm px-7 py-12 sm:px-14 sm:py-16">
          <Sprig className="mx-auto h-10 w-20" />
          <p className="mt-4 text-center font-script text-5xl text-rosegold-deep sm:text-6xl">{letter.greeting}</p>
          <div className="mt-7 space-y-5 font-display text-xl leading-relaxed text-cocoa-soft sm:text-[1.4rem]">
            {letter.paragraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          </div>
          <div className="mt-9 text-right">
            <p className="font-display text-lg italic text-cocoa">{letter.signoff}</p>
            <p className="font-script text-4xl text-rosegold-deep">{letter.name}</p>
          </div>
          {hasLetterAudio && <LetterPlayer src={LETTER_AUDIO} />}
        </Reveal>
      </section>

      <footer className="pb-10 pt-6 text-center">
        <Flourish />
        <p className="caps mt-4 text-[0.6rem] text-taupe">Cynthia&rsquo;s Wedding Plans · Built for the DEV Hacktoberfest 2026 weekend challenge</p>
      </footer>
    </main>
  );
}
