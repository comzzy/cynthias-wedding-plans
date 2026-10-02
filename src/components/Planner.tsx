"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import MicButton, { type MicState } from "./MicButton";
import PlanBoard from "./PlanBoard";
import Flourish from "./Flourish";
import { ArchReveal, Bloom } from "./Reveal";
import { BouquetBottomRight, BouquetTopLeft } from "./Botanicals";
import { migratePlan } from "@/lib/plan";
import { emptyPlan, type ChatTurn, type Plan, type PlanResponse } from "@/lib/types";
import { daysUntil, money, prettyDate } from "@/lib/format";
import { speak, startRecording, stopSpeaking, unlockAudio, type Recording } from "@/lib/audio";

const STORE = "cwp.plan.v1";
const CHAT = "cwp.chat.v1";
const VOICE = "cwp.voice.v1";
const MAX_RECORD_MS = 45_000;

const SUGGESTIONS = [
  "Budget is ₦5 million, about 200 guests, Lagos, this December",
  "We booked the venue in Lekki today",
  "The caterer quoted ₦1.4 million for jollof and small chops",
];


export default function Planner() {
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [state, setState] = useState<MicState>("idle");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [text, setText] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const rec = useRef<Recording | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planRef = useRef(plan);
  const chatRef = useRef(chat);
  useEffect(() => { planRef.current = plan; chatRef.current = chat; }, [plan, chat]);

  // Load from localStorage
  useEffect(() => {
    try {
      const p = localStorage.getItem(STORE);
      if (p) setPlan(migratePlan({ ...emptyPlan(), ...JSON.parse(p) }));
      const c = localStorage.getItem(CHAT);
      if (c) setChat(JSON.parse(c));
      const v = localStorage.getItem(VOICE);
      if (v) setVoiceOn(v === "1");
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORE, JSON.stringify(plan));
    localStorage.setItem(CHAT, JSON.stringify(chat.slice(-30)));
    localStorage.setItem(VOICE, voiceOn ? "1" : "0");
  }, [plan, chat, voiceOn, loaded]);

  const say = useCallback(async (reply: string) => {
    if (!voiceOn) return setState("idle");
    setState("speaking");
    try {
      await speak(reply, (a) => setAnalyser(a));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyser(null);
      setState("idle");
    }
  }, [voiceOn]);

  const send = useCallback(async (message: string, mode: "chat" | "briefing" = "chat") => {
    setError(null);
    setState("thinking");
    const userTurn: ChatTurn[] = mode === "chat" ? [{ role: "user", text: message }] : [];
    if (userTurn.length) setChat((c) => [...c, ...userTurn]);
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, plan: planRef.current, history: chatRef.current.slice(-6), mode }),
      });
      const data = (await r.json()) as PlanResponse & { error?: string };
      if (!r.ok) throw new Error(data.error || "Something went wrong");
      setPlan(data.plan);
      setChat((c) => [...c, { role: "assistant", text: data.reply }]);
      await say(data.reply);
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }, [say]);

  const stopAndSend = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    setAnalyser(null);
    setState("transcribing");
    try {
      const blob = await r.stop();
      if (blob.size < 2000) throw new Error("That was very short. Hold on a little longer and try again.");
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/stt", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "I couldn't hear that.");
      if (!data.text) throw new Error("I didn't catch any words. Try again?");
      await send(data.text);
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }, [send]);

  const onMic = useCallback(async () => {
    unlockAudio();
    if (state === "speaking") return stopSpeaking();
    if (state === "listening") return stopAndSend();
    if (state !== "idle") return;
    setError(null);
    try {
      const r = await startRecording();
      rec.current = r;
      setAnalyser(r.analyser);
      setState("listening");
      timer.current = setTimeout(stopAndSend, MAX_RECORD_MS);
    } catch {
      setError("I need the microphone. Allow it in your browser, or type below.");
    }
  }, [state, stopAndSend]);

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    const m = text.trim();
    if (!m || state !== "idle") return;
    unlockAudio();
    setText("");
    void send(m);
  };

  const reset = () => {
    if (!confirm("Start the plan again from scratch? This clears the checklist, budget and notes on this device.")) return;
    setPlan(emptyPlan());
    setChat([]);
  };

  const f = plan.facts;
  const days = daysUntil(f.date);
  const lastUser = [...chat].reverse().find((c) => c.role === "user");
  const lastReply = [...chat].reverse().find((c) => c.role === "assistant");
  const busy = state === "thinking" || state === "transcribing";
  const statusLine = {
    idle: "Tap the mic and tell me anything",
    listening: "I'm listening. Tap again when you're done",
    transcribing: "Catching every word…",
    thinking: "Updating your plan…",
    speaking: "Speaking. Tap to stop",
  }[state];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-2 sm:px-8 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:gap-12">
      {/* Voice column */}
      <div className="relative lg:sticky lg:top-6 lg:self-start">
        <Bloom className="pointer-events-none absolute -left-[14%] -top-[6%] z-20 w-[48%] sm:-left-[18%] sm:w-[46%]" delay={0.5}>
          <BouquetTopLeft id="pl-tl" className="h-auto w-full" />
        </Bloom>
        <Bloom className="pointer-events-none absolute -bottom-[4%] -right-[12%] z-0 w-[44%] sm:-right-[16%]" delay={0.8} from="right">
          <BouquetBottomRight id="pl-br" className="h-auto w-full" />
        </Bloom>
        <ArchReveal className="relative z-10">
          <div className="arch stagger px-5 pb-8 pt-24 text-center sm:px-8 sm:pt-28" style={{ ["--sd" as string]: "0.7s" }}>
            <p className="caps text-[0.62rem] text-cocoa-soft">The planner</p>
            <h1 className="mt-2 font-script text-5xl leading-none text-rosegold-deep sm:text-6xl">Talk to me</h1>

            <div className="mt-4 min-h-[56px]">
              {days !== null && days >= 0 ? (
                <p className="font-display text-cocoa">
                  <span className="gold-text font-sans text-4xl font-light tracking-wide">{days}</span>
                  <span className="caps ml-2 text-[0.62rem] text-cocoa-soft">days to go</span>
                </p>
              ) : (
                <p className="mx-auto max-w-[17rem] font-display text-lg leading-snug text-cocoa-soft">Budget, guests, city and month. Start there and I&rsquo;ll do the rest.</p>
              )}
              {(f.budget || f.guests || f.city || f.date) && (
                <p className="caps mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.58rem] text-cocoa-soft">
                  {f.budget && <span>{money(f.budget)}</span>}
                  {f.guests && <span>{f.guests} guests</span>}
                  {f.city && <span>{f.city}</span>}
                  {f.date && <span>{prettyDate(f.date, { weekday: "short", day: "numeric", month: "short" })}</span>}
                </p>
              )}
            </div>

            <div className="mt-2">
              <MicButton state={state} analyser={analyser} onClick={onMic} disabled={busy} />
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={state} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="caps -mt-2 text-[0.6rem] text-cocoa-soft" aria-live="polite">
                {statusLine}
              </motion.p>
            </AnimatePresence>

            <div className={`space-y-3 text-left ${chat.length || error ? "mt-6 min-h-[92px]" : "mt-2"}`}>
              <AnimatePresence mode="popLayout">
                {lastUser && (
                  <motion.p key={"u" + chat.length} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-white/60 px-4 py-2.5 text-sm text-cocoa-soft">
                    {lastUser.text}
                  </motion.p>
                )}
                {lastReply && (
                  <motion.p key={"a" + chat.length} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.1 }} className="max-w-[92%] font-display text-[1.15rem] leading-snug text-cocoa">
                    {lastReply.text}
                  </motion.p>
                )}
              </AnimatePresence>
              {error && <p role="alert" className="text-sm text-rosegold-deep">{error}</p>}
            </div>

            <form onSubmit={submitText} className="mt-5 flex items-center gap-2 rounded-full border hairline bg-white/60 py-1.5 pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-rosegold/30">
              <label htmlFor="say" className="sr-only">Type to your planner</label>
              <input id="say" value={text} onChange={(e) => setText(e.target.value)} placeholder="Or type it here…" className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-cocoa placeholder:text-taupe focus:outline-none" />
              <button type="submit" disabled={!text.trim() || state !== "idle"} className="btn-gold caps rounded-full px-4 py-2 text-[0.6rem] disabled:opacity-50">Send</button>
            </form>

            {chat.length === 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.slice(0, 1).map((s) => (
                  <button key={s} onClick={() => { unlockAudio(); void send(s); }} disabled={state !== "idle"} className="rounded-full border hairline px-3 py-1.5 text-left text-xs text-cocoa-soft transition-colors hover:bg-white/60">
                    &ldquo;{s}&rdquo;
                  </button>
                ))}
              </div>
            )}

            <Flourish className="mt-7" />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => { unlockAudio(); void send("", "briefing"); }} disabled={state !== "idle"} className="caps rounded-full border border-rosegold/60 px-5 py-2.5 text-[0.62rem] text-rosegold-deep transition-colors hover:bg-white/60 disabled:opacity-50">
                Today&rsquo;s briefing
              </button>
              <button onClick={() => setVoiceOn((v) => !v)} aria-pressed={voiceOn} className="caps rounded-full px-3 py-2.5 text-[0.58rem] text-cocoa-soft hover:text-cocoa">
                Voice replies: {voiceOn ? "on" : "off"}
              </button>
            </div>
          </div>
        </ArchReveal>
      </div>

      {/* Plan column */}
      <div className="min-w-0">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.6 }}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="caps text-[0.62rem] text-cocoa-soft">Cynthia&rsquo;s plan</p>
              <h2 className="mt-1 font-display text-3xl text-cocoa sm:text-4xl">
                Everything, <span className="font-script text-4xl text-rosegold-deep sm:text-5xl">in one place</span>
              </h2>
            </div>
            {plan.tasks.length > 0 && (
              <button onClick={reset} className="caps shrink-0 text-[0.55rem] text-taupe underline-offset-4 hover:text-cocoa hover:underline">Start over</button>
            )}
          </div>
          <PlanBoard plan={plan} onToggle={(id) => setPlan((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))} />

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/rsvp/list" className="paper group flex items-center justify-between rounded-sm px-5 py-4 transition-colors hover:bg-white/70">
              <span><span className="caps block text-[0.55rem] text-cocoa-soft">Part II</span><span className="font-display text-xl text-cocoa">The guest list</span></span>
              <span className="text-rosegold-deep transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/guestbook" className="paper group flex items-center justify-between rounded-sm px-5 py-4 transition-colors hover:bg-white/70">
              <span><span className="caps block text-[0.55rem] text-cocoa-soft">Part III</span><span className="font-display text-xl text-cocoa">The keepsake</span></span>
              <span className="text-rosegold-deep transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {chat.length > 2 && (
            <details className="paper mt-6 rounded-sm px-5 py-4">
              <summary className="caps cursor-pointer text-[0.6rem] text-cocoa-soft">Our conversation</summary>
              <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1 thin-scroll">
                {chat.map((c, i) => (
                  <li key={i} className={c.role === "user" ? "text-sm text-cocoa-soft" : "font-display text-lg text-cocoa"}>
                    <span className="caps mr-2 text-[0.5rem] text-taupe">{c.role === "user" ? "You" : "Planner"}</span>
                    {c.text}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </motion.div>
      </div>
    </div>
  );
}
