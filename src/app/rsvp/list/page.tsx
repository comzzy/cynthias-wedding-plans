import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Flourish from "@/components/Flourish";
import { ArchReveal, Reveal } from "@/components/Reveal";
import { BouquetBottomRight, BouquetTopLeft, Sprig } from "@/components/Botanicals";
import { Bloom } from "@/components/Reveal";
import { hostAllowed } from "@/lib/host";
import { listRsvps } from "@/lib/store";
import { latestPerGuest, totals } from "@/lib/guests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Guest list · Cynthia's Wedding Plans", robots: { index: false } };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function GuestList({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!hostAllowed(key)) return <Locked />;
  const rsvps = latestPerGuest(await listRsvps());
  const t = totals(rsvps);
  const q = key ? `?key=${encodeURIComponent(key)}` : "";

  const stats = [
    { n: t.headcount, label: "People coming", script: "seats to set" },
    { n: t.attending, label: "Accepted", script: "joyfully" },
    { n: t.declined, label: "Can't make it", script: "sending love" },
    { n: t.responses, label: "Replies", script: "so far" },
  ];

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-3xl">
        <Bloom className="pointer-events-none absolute -left-[10%] -top-[8%] z-20 w-[42%] sm:-left-[14%] sm:w-[34%]" delay={0.5}>
          <BouquetTopLeft id="gl-tl" className="h-auto w-full" />
        </Bloom>
        <Bloom className="pointer-events-none absolute -bottom-[14%] -right-[10%] z-0 w-[40%] sm:-right-[14%] sm:w-[30%]" delay={0.8} from="right">
          <BouquetBottomRight id="gl-br" className="h-auto w-full" />
        </Bloom>
        <ArchReveal className="relative z-10">
          <div className="arch stagger mx-auto max-w-3xl px-6 pb-12 pt-24 text-center sm:pt-28" style={{ ["--sd" as string]: "0.6s" }}>
            <p className="caps text-[0.62rem] text-cocoa-soft">For Cynthia&rsquo;s eyes</p>
            <h1 className="mt-3 font-script text-5xl leading-none text-rosegold-deep sm:text-6xl">The guest list</h1>
            <Flourish className="mt-5" />
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
              {stats.map((s, i) => (
                <Reveal key={s.label} delay={0.6 + i * 0.12}>
                  <p className="gold-text font-sans text-5xl font-light">{s.n}</p>
                  <p className="caps mt-2 text-[0.58rem] text-cocoa">{s.label}</p>
                  <p className="font-script text-xl text-rosegold-deep">{s.script}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </ArchReveal>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Reveal className="order-2 lg:order-1">
            <div className="paper rounded-sm">
              <div className="flex items-center justify-between border-b hairline px-5 py-4">
                <p className="caps text-[0.6rem] text-cocoa-soft">Every reply, newest first</p>
                <a href={`/api/rsvp/csv${q}`} className="caps text-[0.58rem] text-rosegold-deep underline-offset-4 hover:underline">Download CSV</a>
              </div>
              {rsvps.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="font-script text-4xl text-rosegold-deep">No replies yet</p>
                  <p className="mx-auto mt-2 max-w-xs font-display text-lg text-cocoa-soft">Share the RSVP link in the family WhatsApp groups and they&rsquo;ll start arriving here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-rosegold/20">
                  {rsvps.map((r) => (
                    <li key={r.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <p className="font-display text-xl text-cocoa">{r.name}</p>
                          {r.language && r.language !== "English" && <span className="caps text-[0.5rem] text-taupe">{r.language}</span>}
                        </div>
                        {r.dietary.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {r.dietary.map((d) => <span key={d} className="rounded-full border border-sage/50 bg-sage/10 px-2 py-0.5 text-xs text-sage-deep">{d}</span>)}
                          </div>
                        )}
                        {r.note && <p className="mt-2 font-display text-base italic text-cocoa-soft">&ldquo;{r.note}&rdquo;</p>}
                      </div>
                      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                        <span className={`caps rounded-full border px-2.5 py-1 text-[0.52rem] ${r.attending ? "border-sage/70 bg-sage/10 text-sage-deep" : "border-taupe/50 text-taupe"}`}>
                          {r.attending ? `Coming · ${r.partySize}` : "Not coming"}
                        </span>
                        <span className="caps text-[0.5rem] text-taupe">{when(r.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>

          <Reveal className="order-1 lg:order-2" delay={0.15}>
            <aside className="paper rounded-sm px-5 py-6 lg:sticky lg:top-6">
              <Sprig className="mx-auto h-8 w-16" />
              <p className="caps mt-2 text-center text-[0.6rem] text-cocoa-soft">For the caterer</p>
              <h2 className="text-center font-display text-2xl text-cocoa">Food needs</h2>
              {t.dietary.length ? (
                <ul className="mt-4 space-y-2.5">
                  {t.dietary.map((d) => (
                    <li key={d.tag} className="flex items-baseline justify-between gap-3 border-b border-dotted border-rosegold/30 pb-2">
                      <span className="text-[0.95rem] capitalize text-cocoa">{d.tag}</span>
                      <span className="font-display text-lg text-rosegold-deep">{d.people} {d.people === 1 ? "reply" : "replies"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-center font-display text-lg text-cocoa-soft">Nobody has mentioned any yet.</p>
              )}
              <div className="mt-6 text-center">
                <Link href="/rsvp" className="caps text-[0.58rem] text-rosegold-deep underline-offset-4 hover:underline">Open the guest RSVP page</Link>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function Locked() {
  return (
    <main>
      <Nav />
      <section className="mx-auto flex max-w-6xl justify-center px-4 pb-24 sm:px-8">
        <div className="relative w-full max-w-md">
        <Bloom className="pointer-events-none absolute right-[-6%] top-[70%] z-0 w-[46%] sm:right-[-40%] sm:top-[55%] sm:w-[52%]" delay={0.6} from="right">
          <BouquetBottomRight id="lock-br" className="h-auto w-full" />
        </Bloom>
        <ArchReveal className="relative z-10">
          <div className="arch stagger px-7 pb-12 pt-24 text-center" style={{ ["--sd" as string]: "0.6s" }}>
            <p className="caps text-[0.62rem] text-cocoa-soft">Private</p>
            <h1 className="mt-3 font-script text-5xl text-rosegold-deep">For Cynthia only</h1>
            <p className="mx-auto mt-4 max-w-xs font-display text-lg text-cocoa-soft">This list holds everyone&rsquo;s replies. Enter the host key to open it.</p>
            <form method="get" className="mt-6 flex gap-2">
              <label htmlFor="key" className="sr-only">Host key</label>
              <input id="key" name="key" type="password" className="input" placeholder="Host key" autoComplete="current-password" />
              <button className="btn-gold caps shrink-0 rounded-full px-5 text-[0.6rem]">Open</button>
            </form>
          </div>
        </ArchReveal>
        </div>
      </section>
    </main>
  );
}
