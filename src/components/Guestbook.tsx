"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function Guestbook({ initial, host }: { initial: Wish[]; host: boolean }) {
  const [wishes, setWishes] = useState<Wish[]>(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [justAdded, setJustAdded] = useState<Wish | null>(null);
  const [filter, setFilter] = useState<Theme | "all">("all");
  const [draft, setDraft] = useState<{ blob: Blob; secs: number; url: string } | null>(null);
  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.url); }, [draft]);

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
      setDraft(null);
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again?");
    } finally {
      setBusy(false);
    }
  }, [name]);

  const onRecorded = useCallback((blob: Blob, secs: number) => {
    if (blob.size < 2000 || secs < 1.2) return setError("That was very short. Tap, speak your wish, then tap again.");
    setDraft({ blob, secs, url: URL.createObjectURL(blob) });
  }, []);

  const sendVoice = () => {
    if (!draft || busy) return;
    const f = new FormData();
    f.append("audio", draft.blob, "wish.webm");
    f.append("duration", String(Math.round(draft.secs)));
    void submit(f);
  };
  const sendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || text.trim().length < 3) return;
    const f = new FormData();
    f.append("text", text.trim());
    void submit(f);
  };
  const another = () => { setJustAdded(null); setError(null); setDraft(null); setWriting(false); };

  const rec = useRecorder(CAP_MS, onRecorded);
  const onMic = async () => {
    setError(null);
    setJustAdded(null);
    if (rec.listening) return rec.stop();
    setDraft(null);
    try { await rec.start(); } catch { setError("We need the microphone for a voice wish. You can also write one."); }
  };

  const hide = async (id: string) => {
    if (!confirm("Hide this wish from the keepsake page?")) return;
    const r = await fetch("/api/guestbook/hide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
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
              <div className="stagger text-center" style={{ ["--sd" as string]: "0.7s" }}>
                <p className="caps text-[0.62rem] text-cocoa-soft">The guestbook</p>
                <h1 className="mt-3 font-script text-5xl leading-none text-rosegold-deep sm:text-6xl">Leave a wish</h1>
                <p className="mx-auto mt-5 max-w-sm font-display text-xl leading-snug text-cocoa-soft">
                  A prayer, a piece of advice, the story they&rsquo;ll pretend to be embarrassed by. Up to a minute, in your own voice.
                </p>
                <div className="mx-auto mt-6 max-w-xs">
                  <label htmlFor="wname" className="caps mb-2 block text-[0.58rem] text-cocoa-soft">Your name</label>
                  <input id="wname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Uncle Emeka" className="input text-center" maxLength={60} />
                </div>
                <AnimatePresence mode="wait">
                  {justAdded ? (
                    <motion.div key="sent" initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.7, ease }} className="mx-auto mt-8 max-w-sm" role="status">
                      <motion.svg viewBox="0 0 52 52" className="mx-auto h-14 w-14" fill="none" aria-hidden>
                        <motion.circle cx="26" cy="26" r="24" stroke="#c4927a" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease }} />
                        <motion.path d="M16 27 l7 7 l13 -15" stroke="#a8735d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.7, ease }} />
                      </motion.svg>
                      <p className="mt-4 font-script text-4xl leading-none text-rosegold-deep">Sent</p>
                      <p className="mt-2 font-display text-xl text-cocoa">Cynthia will see your wish.</p>
                      <div className="paper mt-5 rounded-sm px-5 py-4 text-left">
                        <p className="caps text-[0.55rem] text-sage-deep">In {THEME_LABEL[justAdded.theme].title.toLowerCase()}</p>
                        <p className="mt-1 font-display text-lg italic leading-snug text-cocoa">&ldquo;{justAdded.text}&rdquo;</p>
                      </div>
                      <button type="button" onClick={another} className="caps mt-6 rounded-full border border-rosegold/60 px-6 py-3 text-[0.6rem] text-rosegold-deep transition-colors hover:bg-white/60">Leave another wish</button>
                    </motion.div>
                  ) : (
                    <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {!writing && (
                        <>
                          <div className="mt-2">
                            <MicButton state={state} analyser={rec.analyser} onClick={onMic} disabled={busy} progress={rec.listening ? rec.elapsed / CAP_MS : 0} idleLabel={draft ? "Tap to record again" : "Tap to record your wish"} stopLabel="Finish recording" />
                          </div>
                          <p className="caps -mt-2 text-[0.6rem] text-cocoa-soft" aria-live="polite">
                            {rec.listening ? `Recording · ${left}s left · tap to finish` : busy ? "Sending your wish…" : draft ? "Listen back, then send it" : "Tap to record"}
                          </p>
                          <AnimatePresence>
                            {draft && !rec.listening && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease }} className="paper mx-auto mt-5 max-w-sm rounded-sm px-4 py-4">
                                <p className="caps text-[0.55rem] text-cocoa-soft">Your wish · {Math.round(draft.secs)}s</p>
                                <audio controls src={draft.url} className="mt-2 w-full" />
                                <div className="mt-4 flex flex-col items-center gap-3">
                                  <SendButton busy={busy} onClick={sendVoice} />
                                  <button type="button" onClick={() => setDraft(null)} disabled={busy} className="caps text-[0.56rem] text-taupe hover:text-cocoa disabled:opacity-50">Discard</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                      {error && <p role="alert" className="mx-auto mt-4 max-w-sm rounded-sm border border-rosegold/40 bg-white/50 px-4 py-2.5 text-sm text-rosegold-deep">{error}{(draft || (writing && text.trim())) && " Tap Send wish to try again."}</p>}
                      <div className="mt-6">
                        {!writing ? (
                          !draft && !rec.listening && <button onClick={() => { setWriting(true); setError(null); }} className="caps text-[0.6rem] text-cocoa-soft underline decoration-rosegold/50 underline-offset-8 hover:text-cocoa">Prefer to write it?</button>
                        ) : (
                          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={sendText} className="mx-auto max-w-md overflow-hidden text-left">
                            <label htmlFor="wtext" className="caps mb-2 block text-center text-[0.58rem] text-cocoa-soft">Your wish</label>
                            <textarea id="wtext" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1200} placeholder="Write your wish for the couple…" className="input resize-none" />
                            <div className="mt-4 flex flex-col items-center gap-3">
                              <SendButton busy={busy} disabled={text.trim().length < 3} />
                              <button type="button" onClick={() => { setWriting(false); setError(null); }} disabled={busy} className="caps text-[0.56rem] text-taupe hover:text-cocoa disabled:opacity-50">Record instead</button>
                            </div>
                          </motion.form>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                          {host && (
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

function SendButton({ busy, disabled, onClick }: { busy: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type={onClick ? "button" : "submit"} onClick={onClick} disabled={busy || disabled} aria-busy={busy} className="btn-gold caps inline-flex min-w-[200px] items-center justify-center gap-2.5 rounded-full px-8 py-3.5 text-[0.66rem] disabled:opacity-60">
      {busy ? (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Sending…
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 8.2 13.5 3l-3.8 10.5-2.2-4.3z" /></svg>
          Send wish
        </>
      )}
    </button>
  );
}
