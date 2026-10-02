"use client";
import { motion, useReducedMotion } from "framer-motion";

/** Thin rose-gold scroll divider, drawn in on view. */
export default function Flourish({ className = "", word }: { className?: string; word?: string }) {
  const reduce = useReducedMotion();
  const draw = {
    hidden: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
    show: { pathLength: 1, opacity: 1, transition: { duration: 1.6, ease: [0.4, 0, 0.2, 1] as const } },
  };
  const Side = ({ flip }: { flip?: boolean }) => (
    <motion.svg viewBox="0 0 110 20" className="h-4 w-24 sm:w-28" style={flip ? { transform: "scaleX(-1)" } : undefined} initial="hidden" whileInView="show" viewport={{ once: true }}>
      <motion.path variants={draw} d="M108 10 H52 C44 10 40 4 34 4 C27 4 26 13 32 13 C37 13 37 7 33 7" fill="none" stroke="#b98069" strokeWidth="1" strokeLinecap="round" />
      <motion.path variants={draw} d="M30 10 C22 16 12 16 4 10" fill="none" stroke="#b98069" strokeWidth=".8" strokeLinecap="round" />
      <circle cx="3" cy="10" r="1.6" fill="#c4927a" />
    </motion.svg>
  );
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden={!word}>
      <Side flip />
      {word ? <span className="caps text-xs text-cocoa-soft">{word}</span> : <span className="block h-1.5 w-1.5 rotate-45 bg-rosegold" />}
      <Side />
    </div>
  );
}
