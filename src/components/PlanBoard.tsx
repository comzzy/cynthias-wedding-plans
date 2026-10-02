"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { Plan, VendorStatus } from "@/lib/types";
import { money, prettyDate, todayISO } from "@/lib/format";

const TABS = ["Checklist", "Budget", "The day", "Vendors"] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLE: Record<VendorStatus, string> = {
  "to find": "text-taupe border-taupe/50",
  contacted: "text-rosegold-deep border-rosegold/50",
  quoted: "text-cocoa-soft border-cocoa-soft/40",
  booked: "text-sage-deep border-sage/70 bg-sage/10",
};

export default function PlanBoard({ plan, onToggle }: { plan: Plan; onToggle: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>("Checklist");
  const today = todayISO();
  const done = plan.tasks.filter((t) => t.done).length;

  return (
    <section className="paper rounded-sm" aria-label="Wedding plan">
      <div className="flex gap-1 overflow-x-auto border-b hairline px-3 pt-3 thin-scroll" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="caps relative shrink-0 px-3 pb-3 pt-1 text-[0.65rem] text-cocoa-soft transition-colors hover:text-cocoa sm:px-4">
            {t}
            {tab === t && <motion.span layoutId="tab-line" className="absolute inset-x-2 -bottom-px h-[1.5px] bg-rosegold" />}
          </button>
        ))}
      </div>

      <div className="relative min-h-[320px] p-5 sm:p-7">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
            {tab === "Checklist" && (
              plan.tasks.length ? (
                <>
                  <div className="mb-5 flex items-center gap-4">
                    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-sand/60">
                      <motion.div className="h-full bg-gradient-to-r from-rosegold to-[#e7bda4]" initial={false} animate={{ width: `${(done / plan.tasks.length) * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <span className="caps text-[0.6rem] text-cocoa-soft">{done} of {plan.tasks.length} done</span>
                  </div>
                  <ul className="max-h-[520px] space-y-1 overflow-y-auto pr-1 thin-scroll">
                    <AnimatePresence initial={false}>
                      {[...plan.tasks]
                        .sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "9").localeCompare(b.due ?? "9"))
                        .map((t) => {
                          const late = !t.done && t.due && t.due < today;
                          return (
                            <motion.li key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                              <label className="group flex cursor-pointer items-start gap-3 rounded-sm px-2 py-2.5 transition-colors hover:bg-white/50">
                                <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} className="peer sr-only" />
                                <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-rosegold/50 ${t.done ? "border-sage bg-sage" : "border-rosegold/70"}`}>
                                  {t.done && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="white" strokeWidth="2"><path d="M2.5 6.5l2.2 2L9.5 3.5" /></svg>}
                                </span>
                                <span className="flex-1">
                                  <span className={`block text-[0.95rem] leading-snug ${t.done ? "text-taupe line-through decoration-rosegold/50" : "text-cocoa"}`}>{t.title}</span>
                                  {/rsvp/i.test(t.title) && (
                                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                      <Link href="/rsvp" className="caps text-[0.56rem] text-rosegold-deep underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>Open the RSVP page</Link>
                                      <CopyLink />
                                    </span>
                                  )}
                                  <span className="caps mt-1 block text-[0.56rem] text-taupe">
                                    {t.category}
                                    {t.due && <span className={late ? "text-rosegold-deep" : ""}> · {late ? "overdue · " : ""}{prettyDate(t.due, { day: "numeric", month: "short" })}</span>}
                                  </span>
                                </span>
                              </label>
                            </motion.li>
                          );
                        })}
                    </AnimatePresence>
                  </ul>
                </>
              ) : <Empty line="Your checklist appears the moment you tell me the basics." />
            )}

            {tab === "Budget" && (
              plan.budget.length ? (
                <div>
                  <p className="caps text-[0.6rem] text-cocoa-soft">Total</p>
                  <p className="font-display text-4xl text-cocoa">{money(plan.facts.budget ?? plan.budget.reduce((a, b) => a + b.amount, 0))}</p>
                  <ul className="mt-6 space-y-4">
                    {plan.budget.map((b, i) => {
                      const max = Math.max(...plan.budget.map((x) => x.amount));
                      return (
                        <li key={b.category}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[0.95rem] text-cocoa">{b.category}</span>
                            <span className="font-display text-lg text-cocoa-soft">{money(b.amount)}</span>
                          </div>
                          <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-sand/50">
                            <motion.div className="h-full rounded-full bg-gradient-to-r from-rosegold-deep via-rosegold to-[#ecc8b2]" initial={{ width: 0 }} animate={{ width: `${(b.amount / max) * 100}%` }} transition={{ duration: 1, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : <Empty line="Tell me your budget and I'll split it across the big costs." />
            )}

            {tab === "The day" && (
              plan.timeline.length ? (
                <ol className="relative ml-2 border-l hairline pl-6">
                  {plan.timeline.map((t, i) => (
                    <motion.li key={t.time + t.item} className="relative pb-6 last:pb-0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                      <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rotate-45 border border-rosegold bg-ivory" />
                      <span className="font-display text-xl italic text-rosegold-deep">{t.time}</span>
                      <p className="text-[0.95rem] text-cocoa">{t.item}</p>
                    </motion.li>
                  ))}
                </ol>
              ) : <Empty line="Once we have a date, I'll sketch the order of the day." />
            )}

            {tab === "Vendors" && (
              plan.vendors.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {plan.vendors.map((v) => (
                    <motion.li key={v.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-sm border hairline bg-white/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="caps text-[0.58rem] text-taupe">{v.category}</p>
                          <p className="mt-1 font-display text-xl text-cocoa">{v.name || "Not chosen yet"}</p>
                        </div>
                        <span className={`caps shrink-0 rounded-full border px-2.5 py-1 text-[0.52rem] ${STATUS_STYLE[v.status]}`}>{v.status}</span>
                      </div>
                      {v.note && <p className="mt-2 text-sm font-light text-cocoa-soft">{v.note}</p>}
                    </motion.li>
                  ))}
                </ul>
              ) : <Empty line={`Mention a vendor ("the caterer quoted 1.2 million") and I'll keep track.`} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function CopyLink() {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void navigator.clipboard?.writeText(`${location.origin}/rsvp`).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); });
      }}
      className="caps text-[0.56rem] text-cocoa-soft underline-offset-4 hover:underline"
    >
      {ok ? "Link copied" : "Copy link for WhatsApp"}
    </button>
  );
}

function Empty({ line }: { line: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
      <span className="font-script text-4xl text-rosegold-deep">Nothing yet</span>
      <p className="mt-3 max-w-xs font-display text-lg text-cocoa-soft">{line}</p>
    </div>
  );
}
