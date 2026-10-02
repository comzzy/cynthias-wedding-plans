"use client";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type MicState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

/** Round mic button with a living ring of bars: the mic level while listening, the voice while speaking. */
export default function MicButton({ state, analyser, onClick, disabled, progress = 0, idleLabel = "Tap to talk to your planner" }: { state: MicState; analyser: AnalyserNode | null; onClick: () => void; disabled?: boolean; progress?: number; idleLabel?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const stateRef = useRef(state);
  const anRef = useRef(analyser);
  const progRef = useRef(progress);
  useEffect(() => { stateRef.current = state; anRef.current = analyser; progRef.current = progress; }, [state, analyser, progress]);

  useEffect(() => {
    const cv = canvas.current!;
    const g = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const S = 260;
    cv.width = S * dpr;
    cv.height = S * dpr;
    g.scale(dpr, dpr);
    const BARS = 56;
    const data = new Uint8Array(64);
    const smooth = new Float32Array(BARS);
    let raf = 0;
    const draw = (t: number) => {
      g.clearRect(0, 0, S, S);
      const st = stateRef.current;
      const an = anRef.current;
      const live = (st === "listening" || st === "speaking") && an;
      if (live) an!.getByteFrequencyData(data);
      for (let i = 0; i < BARS; i++) {
        let v: number;
        if (live) {
          const idx = Math.floor(((i < BARS / 2 ? i : BARS - i) / (BARS / 2)) * 40) + 1;
          v = data[idx] / 255;
        } else if (st === "thinking" || st === "transcribing") {
          v = 0.25 + 0.25 * Math.max(0, Math.sin(t / 220 - i * 0.45));
        } else {
          v = reduce ? 0.12 : 0.1 + 0.06 * Math.sin(t / 900 + i * 0.6);
        }
        smooth[i] += (v - smooth[i]) * 0.25;
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const r0 = 92, len = 6 + smooth[i] * 34;
        const grad = g.createLinearGradient(0, 0, S, S);
        grad.addColorStop(0, "#b98069");
        grad.addColorStop(0.5, "#e7bda4");
        grad.addColorStop(1, "#a8735d");
        g.strokeStyle = grad;
        g.globalAlpha = 0.35 + smooth[i] * 0.65;
        g.lineWidth = 2.2;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0);
        g.lineTo(S / 2 + Math.cos(a) * (r0 + len), S / 2 + Math.sin(a) * (r0 + len));
        g.stroke();
      }
      g.globalAlpha = 1;
      const pr = progRef.current;
      if (pr > 0) {
        // the recording cap, as a thin gold arc
        g.strokeStyle = "rgba(196,146,122,.25)";
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(S / 2, S / 2, 84, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = pr > 0.85 ? "#a8735d" : "#c4927a";
        g.lineWidth = 2.5;
        g.beginPath(); g.arc(S / 2, S / 2, 84, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(pr, 1)); g.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const active = state === "listening" || state === "speaking";
  const label =
    state === "listening" ? "Stop and send" : state === "speaking" ? "Stop speaking" : state === "idle" ? idleLabel : "Working";

  return (
    <div className="relative mx-auto h-[260px] w-[260px]">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />
      {active && !reduce && (
        <>
          <motion.span className="absolute inset-[62px] rounded-full border border-rosegold/60" initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
          <motion.span className="absolute inset-[62px] rounded-full border border-rosegold/40" initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1.8, delay: 0.9, repeat: Infinity, ease: "easeOut" }} />
        </>
      )}
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={state === "listening"}
        whileTap={{ scale: 0.94 }}
        animate={reduce ? undefined : { scale: active ? [1, 1.04, 1] : 1 }}
        transition={active ? { duration: 1.6, repeat: Infinity } : { duration: 0.3 }}
        className={`absolute inset-[66px] flex items-center justify-center rounded-full transition-shadow duration-500 disabled:opacity-60 ${
          state === "listening" ? "bg-gradient-to-br from-[#b4705a] to-[#d9a68c] shadow-[0_18px_40px_-14px_rgba(168,115,93,.95)]" : "btn-gold"
        }`}
      >
        <span className="absolute inset-[5px] rounded-full border border-white/40" />
        {state === "listening" ? (
          <span className="h-7 w-7 rounded-[6px] bg-white/95" />
        ) : state === "speaking" ? (
          <svg viewBox="0 0 24 24" className="h-10 w-10 fill-white/95" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" fill="rgba(255,255,255,.95)" stroke="none" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
