"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const BARS = 32;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
// A soft resting shape so the bars read as a waveform before it plays.
const REST = Array.from({ length: BARS }, (_, i) => 0.18 + 0.22 * Math.abs(Math.sin(i * 0.55)) * Math.sin((i / (BARS - 1)) * Math.PI));

/** "Hear the note": plays the pre-made /audio/kane-letter.mp3 with a live waveform. */
export default function LetterPlayer({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const raf = useRef(0);
  const [levels, setLevels] = useState<number[]>(REST);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [len, setLen] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => () => { cancelAnimationFrame(raf.current); audio.current?.pause(); }, []);

  const tick = () => {
    const an = analyser.current;
    if (an) {
      const data = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(data);
      const step = Math.floor(data.length * 0.7 / BARS) || 1; // voice sits in the lower bins
      setLevels(Array.from({ length: BARS }, (_, i) => Math.max(0.1, data[i * step] / 255)));
    }
    raf.current = requestAnimationFrame(tick);
  };

  const toggle = () => {
    if (!audio.current) {
      const a = new Audio(src);
      a.preload = "auto";
      a.ontimeupdate = () => setT(a.currentTime);
      a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) setLen(a.duration); };
      a.onplay = () => { setPlaying(true); if (!reduce) { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(tick); } };
      a.onpause = () => { setPlaying(false); cancelAnimationFrame(raf.current); setLevels(REST); };
      a.onended = () => { setPlaying(false); setT(0); cancelAnimationFrame(raf.current); setLevels(REST); };
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const node = ctx.createMediaElementSource(a);
        const an = ctx.createAnalyser();
        an.fftSize = 256; an.smoothingTimeConstant = 0.75;
        node.connect(an); an.connect(ctx.destination);
        analyser.current = an;
        a.addEventListener("play", () => void ctx.resume());
      } catch { /* no Web Audio: still plays, bars stay at rest */ }
      audio.current = a;
    }
    if (audio.current.paused) void audio.current.play(); else audio.current.pause();
  };

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggle}
          aria-label={playing ? "Pause the note" : "Hear the note"}
          className="btn-gold relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-white"><path d="M7 5.5v13l11-6.5z" /></svg>
          )}
          {playing && !reduce && (
            <motion.span className="absolute inset-0 rounded-full border border-rosegold" initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }} />
          )}
        </motion.button>
        <div className="flex h-10 items-center gap-[3px]" aria-hidden>
          {levels.map((v, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-gradient-to-t from-rosegold-deep to-[#e7bda4] transition-[height] duration-100"
              style={{ height: `${Math.round(6 + v * 34)}px`, opacity: playing ? 0.95 : 0.55 }}
            />
          ))}
        </div>
      </div>
      <p className="caps text-[0.58rem] text-cocoa-soft">
        {playing || t ? `${fmt(t)}${len ? " / " + fmt(len) : ""}` : "Hear the note"}
      </p>
    </div>
  );
}
