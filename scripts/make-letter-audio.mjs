// One-time generation of Kane's letter as /public/audio/kane-letter.mp3.
// The landing page shows "Hear the note" only when that file exists, so playback never costs credits.
//
//   VOICE_ID=<the planner voice id> node --env-file=.env.local scripts/make-letter-audio.mjs            # generate
//   node scripts/make-letter-audio.mjs --dry-run                                             # show text + credit estimate
//   ... --force                                                                              # replace an existing file
//
// Needs ELEVENLABS_API_KEY. Uses eleven_multilingual_v2 (about 1 credit per character).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const letter = JSON.parse(fs.readFileSync(path.join(root, "src/content/letter.json"), "utf8"));
const out = path.join(root, "public/audio/kane-letter.mp3");
const args = new Set(process.argv.slice(2));

// Exactly the words on the page, with short pauses between the parts.
const text = [letter.greeting, ...letter.paragraphs, `${letter.signoff} ${letter.name}.`].join("\n\n");
console.log(`${text}\n\n${text.length} characters, roughly ${text.length} credits on eleven_multilingual_v2.`);
if (args.has("--dry-run")) process.exit(0);

const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.VOICE_ID;
if (!key) { console.error("Set ELEVENLABS_API_KEY."); process.exit(1); }
if (!voice) { console.error("Set VOICE_ID to the voice that should read the note (the same one as the planner)."); process.exit(1); }
if (fs.existsSync(out) && !args.has("--force")) { console.error(`${path.relative(root, out)} already exists. Use --force to replace it.`); process.exit(1); }

const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
  body: JSON.stringify({
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 0.95 },
  }),
});
if (!r.ok) { console.error(`ElevenLabs said ${r.status}: ${(await r.text()).slice(0, 300)}`); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
console.log(`Saved ${path.relative(root, out)} (${Math.round(fs.statSync(out).size / 1024)} KB). Rebuild so the player appears.`);
