"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { startRecording, unlockAudio, type Recording } from "./audio";

/** Tap-to-start / tap-to-stop recorder with a hard cap. */
export function useRecorder(maxMs: number, onDone: (blob: Blob, seconds: number) => void) {
  const [listening, setListening] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<Recording | null>(null);
  const t0 = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  const stop = useCallback(async () => {
    const cur = rec.current;
    if (!cur) return;
    rec.current = null;
    if (tick.current) clearInterval(tick.current);
    setListening(false);
    setAnalyser(null);
    const secs = (Date.now() - t0.current) / 1000;
    const blob = await cur.stop();
    done.current(blob, secs);
  }, []);

  const start = useCallback(async () => {
    unlockAudio();
    const cur = await startRecording();
    rec.current = cur;
    t0.current = Date.now();
    setElapsed(0);
    setAnalyser(cur.analyser);
    setListening(true);
    tick.current = setInterval(() => {
      const e = Date.now() - t0.current;
      setElapsed(e);
      if (e >= maxMs) void stop();
    }, 200);
  }, [maxMs, stop]);

  useEffect(() => () => { rec.current?.cancel(); if (tick.current) clearInterval(tick.current); }, []);
  return { listening, analyser, elapsed, start, stop };
}
