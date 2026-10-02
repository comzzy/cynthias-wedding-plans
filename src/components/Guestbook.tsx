"use client";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MicButton, { type MicState } from "./MicButton";
import Flourish from "./Flourish";
import WishAudio from "./WishAudio";
import { ArchReveal, Bloom, Reveal } from "./Reveal";
import { BouquetBottomRight, BouquetTopLeft } from "./Botanicals";
import { useRecorder } from "@/lib/useRecorder";
import { THEME_LABEL, THEMES, type Theme, type Wish } from "@/lib/guests";

const CAP_MS = 60_000;
const ease = [0.22, 1, 0.36, 1] as const;

export default function Guestbook({ initial, hostKey }: { initial: Wish[]; hostKey: string | null }) {
  const [wishes, setWishes] = useState<Wish[]>(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [justAdded, setJustAdded] = useState<Wish | null>(null);
  const [filter, setFilter] = useState<Theme | "all">("all");

  const submit = useCallback(async (form: FormData) => {
    setBusy(true);
    setError(null);
    try {
      form.append("name", name);
      const r = await fetch("/api/guestbook", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setWishes((w) => [d.wish, ...w]);
      setJustAdded(d.wish);
      setText("");
      setWriting(false);
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again?");
    } finally {
      setBusy(false);
    }
  }, [name]);

  const onRecorded = useCallback((blob: Blob, secs: number) => {
    if (blob.size < 2000 || secs < 1.2) return setError("That was very short. Tap, speak your wish, then tap again.");
    const f = new FormData();
    f.append("audio", blob, "wish.webm");
    f.append("duration", String(Math.round(secs)));
    void submit(f);
  }, [submit]);

  const rec = useRecorder(CAP_MS, onRecorded);
  const onMic = async () => {
    setError(null);
    setJustAdded(null);
    if (rec.listening) return rec.stop();
    try { await rec.start(); } catch { setError("We need the microphone for a voice wish. You can also write one."); }
  };

  const hide = async (id: string) => {
    if (!confirm("Hide this wish from the keepsake page?")) return;
    const r = await fetch("/api/guestbook/hide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, key: hostKey }) });
    if (r.ok) setWishes((w) => w.filter((x) => x.id !== id));
  };

  const groups = useMemo(() => THEMES.map((th) => ({ theme: th, items: wishes.filter((w) => w.theme === th) })), [wishes]);
  const left = Math.max(0, Math.ceil((CAP_MS - rec.elapsed) / 1000));
  const state: MicState = rec.listening ? "listening" : busy ? "thinking" : "idle";

  return (
    <>
      <section className="mx-auto flex max-w-6xl justify-center px-4 pb-16 pt-4 sm:px-8">
        <div className="relative w-full max-w-[540px]">
          <Bloom className="pointer-events-none absolute -left-[14%] -top-[5%] z-20 w-[46%] sm:-left-[28%] sm:-top-[7%] sm:w-[58%]" delay={0.5}>
            <BouquetTopLeft id="gb-tl" className="h-auto w-full" />
          </Bloom>
          <Bloom className="pointer-events-none absolute -bottom-[6%] -right-[14%] z-0 w-[44%] sm:-right-[30%] sm:w-[56%]" delay={0.8} from="right">
            <BouquetBottomRight id="gb-br" className="h-auto w-full" />
          </Bloom>
          <ArchReveal className="relative z-10">
            <div className="arch px-5 pb-14 pt-32 sm:px-12 sm:pt-36">
      {/* Recorder */}
              <div className="text-center">
                <p className="caps text-[0.62rem] text-cocoa-soft">The guestbook</p>
                <h1 className="mt-3 font-script text-5xl leading-none text-rosegold-deep sm:text-6xl">Leave a wish</h1>
                <p className="mx-auto mt-5 max-w-sm font-display text-xl leading-snug text-cocoa-soft">
                  A prayer, a piece of advice, the story they&rsquo;ll pretend to be embarrassed by. Up to a minute, in your own voice.
                </p>
                <div className="mx-auto mt-6 max-w-xs">
                  <label htmlFor="wname" className="caps mb-2 block text-[0.58rem] text-cocoa-soft">Your name</label>
                  <input id="wname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Uncle Emeka" className="input text-center" maxLength={60} />
                </div>
                <div className="mt-2">
                  <MicButton state={state} analyser={rec.analyser} onClick={onMic} disabled={busy} progress={rec.listening ? rec.elapsed / CAP_MS : 0} idleLabel="Tap to record your wish" />
                </div>
                <p className="caps -mt-2 text-[0.6rem] text-cocoa-soft" aria-live="polite">
                  {rec.listening ? `Recording · ${left}s left · tap to finish` : busy ? "Writing your words into the book…" : "Tap to record"}
                </p>
        
                <AnimatePresence>
                  {justAdded && (
                    <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease }} className="paper mx-auto mt-6 max-w-sm rounded-sm px-5 py-4 text-left">
                      <p className="caps text-[0.55rem] text-sage-deep">Added to {THEME_LABEL[justAdded.theme].title.toLowerCase()}</p>
                      <p className="mt-1 font-display text-lg italic leading-snug text-cocoa">&ldquo;{justAdded.text}&rdquo;</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {error && <p role="alert" className="mx-auto mt-4 max-w-sm text-sm text-rosegold-deep">{error}</p>}
        
                <div className="mt-6">
                  {!writing ? (
                    <button onClick={() => setWriting(true)} className="caps text-[0.6rem] text-cocoa-soft underline decoration-rosegold/50 underline-offset-8 hover:text-cocoa">Prefer to write it?</button>
                  ) : (
                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={(e) => { e.preventDefault(); if (text.trim().length < 3) return; const f = new FormData(); f.append("text", text.trim()); void submit(f); }} className="mx-auto max-w-md overflow-hidden text-left">
                      <label htmlFor="wtext" className="sr-only">Your wish</label>
                      <textarea id="wtext" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1200} placeholder="Write your wish for the couple…" className="input resize-none" />
                      <div className="mt-3 text-center">
                        <button disabled={busy || text.trim().length < 3} className="btn-gold caps rounded-full px-7 py-3 text-[0.62rem] disabled:opacity-50">Add to the book</button>
                      </div>
                    </motion.form>
                  )}
                </div>
              </div>
        
            </div>
          </ArchReveal>
        </div>
      </section>

      {/* Keepsake */}
      <section className="mx-auto max-w-6xl px-4 pb-28 sm:px-8" aria-labelledby="keepsake">
        <Reveal className="text-center">
          <p className="caps text-[0.62rem] text-cocoa-soft">The keepsake</p>
          <h2 id="keepsake" className="mt-3 font-display text-4xl text-cocoa sm:text-5xl">
            Words to <span className="font-script text-5xl text-rosegold-deep sm:text-6xl">keep forever</span>
          </h2>
          <Flourish className="mt-5" />
        </Reveal>

        {wishes.length > 0 && (
          <div className="mt-8 flex justify-center">
            <div className="flex gap-1 overflow-x-auto rounded-full border hairline bg-white/40 p-1 thin-scroll" role="tablist" aria-label="Filter wishes">
              {(["all", ...THEMES] as const).map((th) => {
                const n = th === "all" ? wishes.length : wishes.filter((w) => w.theme === th).length;
                return (
                  <button key={th} role="tab" aria-selected={filter === th} onClick={() => setFilter(th)} className={`relative shrink-0 rounded-full px-3.5 py-2 text-[0.58rem] caps transition-colors sm:px-4 ${filter === th ? "text-white" : "text-cocoa-soft hover:text-cocoa"}`}>
                    {filter === th && <motion.span layoutId="gb-filter" className="absolute inset-0 rounded-full bg-gradient-to-br from-[#b98069] to-[#d8a98f]" transition={{ type: "spring", stiffness: 350, damping: 32 }} />}
                    <span className="relative">{th === "all" ? "All" : THEME_LABEL[th].title.replace("Blessings & prayers", "Blessings").replace("The funny ones", "Funny")} · {n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {wishes.length === 0 ? (
          <Reveal className="mx-auto mt-12 max-w-md text-center">
            <p className="font-script text-4xl text-rosegold-deep">The first page is waiting</p>
            <p className="mt-3 font-display text-lg text-cocoa-soft">Be the first to leave a wish. It will appear here for the couple to play back for years.</p>
          </Reveal>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={filter} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease }} className="mt-10 space-y-14">
              {groups.filter((g) => g.items.length && (filter === "all" || filter === g.theme)).map((g) => (
                <div key={g.theme}>
                  <div className="mb-6 flex items-baseline justify-center gap-3 text-center">
                    <h3 className="caps text-xs text-cocoa">{THEME_LABEL[g.theme].title}</h3>
                    <span className="font-script text-2xl text-rosegold-deep">{THEME_LABEL[g.theme].script}</span>
                  </div>
                  <ul className="flex flex-wrap items-start justify-center gap-5">
                    {g.items.map((w, i) => (
                      <motion.li key={w.id} layout initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: Math.min(i, 6) * 0.08, ease }} className="paper relative w-full rounded-sm px-6 pb-5 pt-7 sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]">
                        <span aria-hidden className="absolute left-5 top-1 font-display text-6xl leading-none text-rosegold/30">&ldquo;</span>
                        <p className="caps text-[0.55rem] text-rosegold-deep">{w.title}</p>
                        <p className="mt-2 font-display text-[1.2rem] italic leading-snug text-cocoa">{w.text}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className="font-script text-2xl text-rosegold-deep">{w.name}</p>
                          {hostKey !== null && (
                            <button onClick={() => hide(w.id)} className="caps text-[0.5rem] text-taupe hover:text-rosegold-deep">Hide</button>
                          )}
                        </div>
                        {w.audio && <div className="mt-3"><WishAudio id={w.id} duration={w.durationSec} /></div>}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </section>
    </>
  );
}
