"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";

/** Cynthia's password form for the guest list. */
export default function HostLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shake = useAnimationControls();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/host/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (r.ok) { setPw(""); router.refresh(); return; }
      const d = await r.json().catch(() => ({}));
      setError(d.error || "That's not quite it. Try again?");
      void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.5 } });
    } catch {
      setError("Couldn't reach the list just now. Try again?");
    }
    setBusy(false);
  };

  return (
    <motion.form animate={shake} onSubmit={submit} className="mt-7">
      <label htmlFor="host-pw" className="sr-only">Password</label>
      <div className="flex gap-2">
        <input
          id="host-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          className="input" placeholder="Password" autoComplete="current-password" autoFocus
          aria-invalid={Boolean(error)} aria-describedby={error ? "host-pw-err" : undefined}
        />
        <motion.button whileTap={{ scale: 0.95 }} disabled={busy} className="btn-gold caps shrink-0 rounded-full px-5 text-[0.6rem] disabled:opacity-70">
          {busy ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white align-middle" /> : "Open"}
        </motion.button>
      </div>
      <p id="host-pw-err" role="alert" className="mt-3 min-h-[1.25rem] font-display text-base italic text-rosegold-deep">{error}</p>
    </motion.form>
  );
}

/** Signs Cynthia out on this device. */
export function LockButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => { setBusy(true); await fetch("/api/host/logout", { method: "POST" }).catch(() => {}); router.refresh(); }}
      disabled={busy}
      className="caps inline-flex items-center gap-1.5 text-[0.55rem] text-taupe underline-offset-4 hover:text-cocoa hover:underline"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="2" aria-hidden><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      Lock the list
    </button>
  );
}
