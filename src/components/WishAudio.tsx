"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

let current: HTMLAudioElement | null = null;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Small rose-gold player. Fetches the clip as a blob on first play (works on iOS without range requests). */
export default function WishAudio({ id, duration }: { id: string; duration: number | null }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [t, setT] = useState(0);
  const [len, setLen] = useState(duration ?? 0);

  useEffect(() => () => { audio.current?.pause(); if (audio.current?.src) URL.revokeObjectURL(audio.current.src); }, []);

  const toggle = async () => {
    if (playing) { audio.current?.pause(); return; }
    if (!audio.current) {
      setLoading(true);
      try {
        const r = await fetch(`/api/audio/${id}`);
        if (!r.ok) throw new Error();
        const a = new Audio(URL.createObjectURL(await r.blob()));
        a.ontimeupdate = () => setT(a.currentTime);
        a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) setLen(a.duration); };
        a.onplay = () => setPlaying(true);
        a.onpause = () => setPlaying(false);
        a.onended = () => { setPlaying(false); setT(0); };
        audio.current = a;
      } catch {
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    if (current && current !== audio.current) current.pause();
    current = audio.current;
    void audio.current.play();
  };

  const pct = len ? Math.min(100, (t / len) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <motion.button whileTap={{ scale: 0.9 }} onClick={toggle} aria-label={playing ? "Pause this wish" : "Play this wish"} className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full btn-gold">
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-white"><path d="M7 5.5v13l11-6.5z" /></svg>
        )}
        {playing && <motion.span className="absolute inset-0 rounded-full border border-rosegold" initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity }} />}
      </motion.button>
      <div className="flex-1">
        <div className="h-[3px] overflow-hidden rounded-full bg-sand/60">
          <div className="h-full bg-gradient-to-r from-rosegold-deep to-[#e7bda4] transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <p className="caps mt-1.5 text-[0.5rem] text-taupe">{playing || t ? fmt(t) + " / " : ""}{len ? fmt(len) : "listen"}</p>
      </div>
    </div>
  );
}
