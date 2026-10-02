"use client";
import { motion, useReducedMotion } from "framer-motion";

export function Reveal({ children, delay = 0, className = "", y = 18 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** The arch rises out of the page on load. */
export function ArchReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)", opacity: 0.4, y: 30 }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1, y: 0 }}
      transition={{ duration: 1.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Bloom({ children, className = "", delay = 0, from = "left" }: { children: React.ReactNode; className?: string; delay?: number; from?: "left" | "right" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, scale: 0.85, x: from === "left" ? -30 : 30, rotate: from === "left" ? -6 : 6 }}
      animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
      transition={{ duration: 1.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
