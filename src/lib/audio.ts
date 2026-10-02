"use client";
/** Tiny audio engine: mic recording + TTS playback, both exposing an AnalyserNode for the waveform. */

let ctx: AudioContext | null = null;
let player: HTMLAudioElement | null = null;
let playerNode: MediaElementAudioSourceNode | null = null;
let playerAnalyser: AnalyserNode | null = null;

export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call inside a tap so iOS lets us play audio later. */
export function unlockAudio() {
  const c = audioCtx();
  if (!player) {
    player = new Audio();
    player.preload = "auto";
    player.setAttribute("playsinline", "");
    // a 0.05s silent wav
    player.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    void player.play().catch(() => {});
    playerNode = c.createMediaElementSource(player);
    playerAnalyser = c.createAnalyser();
    playerAnalyser.fftSize = 128;
    playerNode.connect(playerAnalyser);
    playerAnalyser.connect(c.destination);
  }
}

export type Recording = { analyser: AnalyserNode; stop: () => Promise<Blob>; cancel: () => void };

export async function startRecording(): Promise<Recording> {
  const c = audioCtx();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const src = c.createMediaStreamSource(stream);
  const analyser = c.createAnalyser();
  analyser.fftSize = 128;
  src.connect(analyser);
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported?.(m));
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(250);
  const cleanup = () => {
    stream.getTracks().forEach((t) => t.stop());
    src.disconnect();
  };
  return {
    analyser,
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          cleanup();
          resolve(new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" }));
        };
        rec.state !== "inactive" ? rec.stop() : rec.onstop?.(new Event("stop"));
      }),
    cancel: () => {
      try { rec.stop(); } catch {}
      cleanup();
    },
  };
}

let currentUrl: string | null = null;

export async function speak(text: string, onStart?: (a: AnalyserNode | null) => void): Promise<void> {
  unlockAudio();
  const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Voice unavailable");
  const blob = await res.blob();
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);
  const p = player!;
  p.src = currentUrl;
  await new Promise<void>((resolve, reject) => {
    p.onended = () => resolve();
    p.onerror = () => reject(new Error("Playback failed"));
    p.play().then(() => onStart?.(playerAnalyser), reject);
  });
}

export function stopSpeaking() {
  if (player && !player.paused) {
    player.pause();
    player.onended?.(new Event("ended"));
  }
}
