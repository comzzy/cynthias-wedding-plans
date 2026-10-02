"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import MicButton, { type MicState } from "./MicButton";
import Flourish from "./Flourish";
import { speak, stopSpeaking, unlockAudio } from "@/lib/audio";
import { useRecorder } from "@/lib/useRecorder";
import type { RsvpDraft } from "@/lib/guests";

type Step = "speak" | "confirm" | "done";
const ease = [0.22, 1, 0.36, 1] as const;
const stepAnim = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease } },
  exit: { opacity: 0, y: -16, filter: "blur(4px)", transition: { duration: 0.35 } },
};

export default function RsvpFlow() {
  const [step, setStep] = useState<Step>("speak");
  const [busy, setBusy] = useState<"" | "transcribing" | "thinking" | "saving">("");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<RsvpDraft | null>(null);
  const [newDiet, setNewDiet] = useState("");
  const [thanks, setThanks] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceAnalyser, setVoiceAnalyser] = useState<AnalyserNode | null>(null);

  const parse = useCallback(async (said: string) => {
    setBusy("thinking");
    try {
      const r = await fetch("/api/rsvp/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: said }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDraft(d.draft);
      setStep("confirm");
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again?");
    } finally {
      setBusy("");
    }
  }, []);

  const onRecorded = useCallback(async (blob: Blob) => {
    if (blob.size < 2000) return setError("That was very short. Tap, speak, then tap again.");
    setBusy("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "rsvp.webm");
      const r = await fetch("/api/stt", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok || !d.text) throw new Error(d.error || "We didn't catch any words. Try again?");
      await parse(d.text);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }, [parse]);

  const rec = useRecorder(40_000, onRecorded);

  const onMic = async () => {
    setError(null);
    if (rec.listening) return rec.stop();
    try { await rec.start(); } catch { setError("We need the microphone for that. You can also write your reply below."); }
  };

  const save = async () => {
    if (!draft) return;
    if (draft.name.trim().length < 2) return setError("Please add your name so Cynthia knows who's coming.");
    setError(null);
    setBusy("saving");
    try {
      const r = await fetch("/api/rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setThanks(d.thankYou);
      setStep("done");
    } catch (e) {
      setError((e as Error).message || "We couldn't save that. Try again?");
    } finally {
      setBusy("");
    }
  };

  const hearThanks = async () => {
    if (speaking) return stopSpeaking();
    unlockAudio();
    setSpeaking(true);
    try { await speak(thanks, setVoiceAnalyser); } catch (e) { setError((e as Error).message); }
    setSpeaking(false);
    setVoiceAnalyser(null);
  };

  const micState: MicState = rec.listening ? "listening" : busy === "transcribing" ? "transcribing" : busy === "thinking" ? "thinking" : "idle";
  const upd = (p: Partial<RsvpDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {step === "speak" && (
          <motion.div key="speak" {...stepAnim} className="text-center">
            <p className="caps text-[0.62rem] text-cocoa-soft">Kindly reply</p>
            <h1 className="mt-3 font-script text-5xl leading-none text-rosegold-deep sm:text-6xl">Will you be there?</h1>
            <p className="mx-auto mt-5 max-w-sm font-display text-xl leading-snug text-cocoa-soft">
              Tap the mic and tell us in your own words: your name, if you&rsquo;re coming, how many of you, and anything you can&rsquo;t eat.
            </p>
            <div className="mt-2">
              <MicButton state={micState} analyser={rec.analyser} onClick={onMic} disabled={!!busy} progress={rec.listening ? rec.elapsed / 40_000 : 0} idleLabel="Tap to speak your RSVP" />
            </div>
            <p className="caps -mt-2 text-[0.6rem] text-cocoa-soft" aria-live="polite">
              {rec.listening ? "Listening. Tap again when you're done" : busy === "transcribing" ? "Catching every word…" : busy === "thinking" ? "Writing it down…" : "English or Pidgin, both are fine"}
            </p>
            <div className="mx-auto mt-6 max-w-sm space-y-2 font-display text-[1.05rem] italic leading-snug text-taupe">
              <p>&ldquo;It&rsquo;s Aunty Ngozi. I&rsquo;m coming with my husband, and he doesn&rsquo;t take pepper.&rdquo;</p>
              <p>&ldquo;Na Tunde. I go come, but I no dey chop meat o.&rdquo;</p>
            </div>
            <Flourish className="mt-7" word="or write it" />
            <form
              onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) { setError(null); void parse(text.trim()); } }}
              className="mx-auto mt-5 max-w-md text-left"
            >
              <label htmlFor="rsvp-text" className="sr-only">Write your RSVP</label>
              <textarea id="rsvp-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Your name, whether you're coming, how many of you, any food needs…" className="w-full resize-none rounded-sm border hairline bg-white/60 px-4 py-3 text-[0.95rem] text-cocoa placeholder:text-taupe focus:outline-none focus:ring-2 focus:ring-rosegold/30" />
              <div className="mt-3 text-center">
                <button type="submit" disabled={!text.trim() || !!busy} className="btn-gold caps rounded-full px-7 py-3 text-[0.62rem] disabled:opacity-50">Continue</button>
              </div>
            </form>
          </motion.div>
        )}

        {step === "confirm" && draft && (
          <motion.div key="confirm" {...stepAnim}>
            <div className="text-center">
              <p className="caps text-[0.62rem] text-cocoa-soft">One last look</p>
              <h1 className="mt-3 font-script text-5xl leading-none text-rosegold-deep sm:text-6xl">Did we get it right?</h1>
              {draft.transcript && (
                <p className="mx-auto mt-4 max-w-sm font-display text-base italic leading-snug text-taupe">You said: &ldquo;{draft.transcript}&rdquo;</p>
              )}
            </div>
            <div className="mx-auto mt-7 max-w-md space-y-6 text-left">
              <Field label="Your name">
                <input value={draft.name} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Aunty Ngozi Okafor" className="input" />
              </Field>
              <Field label="Your reply">
                <div className="grid grid-cols-2 gap-2 rounded-full border hairline bg-white/50 p-1">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" onClick={() => upd({ attending: v, partySize: v ? Math.max(1, draft.partySize) : 0 })} className={`relative rounded-full px-3 py-2.5 text-sm transition-colors ${draft.attending === v ? "text-white" : "text-cocoa-soft hover:text-cocoa"}`}>
                      {draft.attending === v && <motion.span layoutId="rsvp-yes" className="absolute inset-0 rounded-full bg-gradient-to-br from-[#b98069] to-[#d8a98f]" transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
                      <span className="relative font-display text-lg">{v ? "Joyfully accepts" : "Sadly can't come"}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <AnimatePresence initial={false}>
                {draft.attending && (
                  <motion.div key="more" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-6 overflow-hidden">
                    <Field label="How many of you, including you">
                      <div className="flex items-center gap-4">
                        <Step label="One fewer" onClick={() => upd({ partySize: Math.max(1, draft.partySize - 1) })}>−</Step>
                        <motion.span key={draft.partySize} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-10 text-center font-display text-4xl text-cocoa">{draft.partySize}</motion.span>
                        <Step label="One more" onClick={() => upd({ partySize: Math.min(20, draft.partySize + 1) })}>+</Step>
                      </div>
                    </Field>
                    <Field label="Food needs">
                      <div className="flex flex-wrap gap-2">
                        {draft.dietary.map((d) => (
                          <span key={d} className="inline-flex items-center gap-1.5 rounded-full border border-sage/60 bg-sage/10 py-1 pl-3 pr-1.5 text-sm text-sage-deep">
                            {d}
                            <button type="button" aria-label={`Remove ${d}`} onClick={() => upd({ dietary: draft.dietary.filter((x) => x !== d) })} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-sage/20">×</button>
                          </span>
                        ))}
                        <form onSubmit={(e) => { e.preventDefault(); const v = newDiet.trim().toLowerCase(); if (v && !draft.dietary.includes(v)) upd({ dietary: [...draft.dietary, v].slice(0, 6) }); setNewDiet(""); }} className="inline-flex">
                          <input value={newDiet} onChange={(e) => setNewDiet(e.target.value)} placeholder={draft.dietary.length ? "Add another" : "None, or add one"} aria-label="Add a food need" className="w-36 rounded-full border hairline bg-white/60 px-3 py-1 text-sm text-cocoa placeholder:text-taupe focus:outline-none" />
                        </form>
                      </div>
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
              <Field label="A note for the couple (optional)">
                <textarea value={draft.note} onChange={(e) => upd({ note: e.target.value })} rows={2} className="input resize-none" />
              </Field>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button onClick={save} disabled={!!busy} className="btn-gold caps rounded-full px-8 py-3.5 text-[0.65rem] disabled:opacity-60">{busy === "saving" ? "Saving…" : "Send my RSVP"}</button>
              <button onClick={() => { setStep("speak"); setDraft(null); setError(null); }} className="caps px-4 py-2 text-[0.6rem] text-cocoa-soft underline-offset-4 hover:underline">Start again</button>
            </div>
          </motion.div>
        )}

        {step === "done" && draft && (
          <motion.div key="done" {...stepAnim} className="text-center">
            <motion.svg viewBox="0 0 80 80" className="mx-auto h-16 w-16" aria-hidden>
              <motion.circle cx="40" cy="40" r="36" fill="none" stroke="#c4927a" strokeWidth="1.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease }} />
              <motion.path d="M26 41l9 9 19-20" fill="none" stroke="#a8735d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: 0.9, ease }} />
            </motion.svg>
            <h1 className="mt-4 font-script text-6xl leading-none text-rosegold-deep">Thank you</h1>
            <p className="mx-auto mt-5 max-w-sm font-display text-xl leading-snug text-cocoa-soft">{thanks}</p>
            <div className="mx-auto mt-6 max-w-xs">
              {speaking && <div className="-my-6 scale-75"><MicButton state="speaking" analyser={voiceAnalyser} onClick={hearThanks} /></div>}
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              <button onClick={hearThanks} className="caps rounded-full border border-rosegold/60 px-6 py-2.5 text-[0.62rem] text-rosegold-deep hover:bg-white/60">{speaking ? "Stop" : "Hear a thank-you"}</button>
              <Link href="/guestbook" className="btn-gold caps mt-2 rounded-full px-7 py-3 text-[0.62rem]">Leave a wish in the guestbook</Link>
              <button onClick={() => { setStep("confirm"); setError(null); }} className="caps mt-2 text-[0.58rem] text-cocoa-soft underline-offset-4 hover:underline">Change my answer</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p role="alert" className="mx-auto mt-5 max-w-sm text-center text-sm text-rosegold-deep">{error}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="caps mb-2 text-[0.58rem] text-cocoa-soft">{label}</p>
      {children}
    </div>
  );
}

function Step({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.9 }} aria-label={label} onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-full border border-rosegold/60 font-display text-2xl text-rosegold-deep hover:bg-white/60">
      {children}
    </motion.button>
  );
}
