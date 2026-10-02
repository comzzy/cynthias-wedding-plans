# Cynthia's Wedding Plans

A voice wedding planner I built for my friend Cynthia, who is planning her wedding in Nigeria.
She taps a mic and talks: *"Budget is 5 million, about 200 guests, Lagos, December."*
An **open-weight language model** turns that into a real plan (checklist with due dates, a budget split,
the order of the day, a vendor tracker), and **ElevenLabs** listens to her and answers back in a warm voice.

Built for the DEV **Hacktoberfest 2026 Weekend Challenge: Build for a Friend**, entering *Best Use of ElevenLabs*.

| Part | Status |
| --- | --- |
| I. Voice Planner | ✅ working |
| II. Voice RSVP (`/rsvp`, host view `/rsvp/list`) | ✅ working |
| III. Voice Guestbook keepsake (`/guestbook`) | ✅ working |

## How it works

```
 mic (MediaRecorder) ──► /api/stt ──► ElevenLabs Speech-to-Text (Scribe)
                                         │ transcript
                                         ▼
                           /api/plan ──► open-weight LLM (OpenAI-compatible API)
                                         │ JSON patch: facts, tasks, budget, timeline, vendors + spoken reply
                                         ▼
                      merge + validate (src/lib/plan.ts) ──► plan saved in localStorage
                                         │ reply
                                         ▼
                           /api/tts ──► ElevenLabs Text-to-Speech ──► audio + live waveform
```

* **Open-source AI at the core.** The model reads Cynthia's words and the current plan, then returns a structured patch:
  new facts (budget, guests, city, date, style), new tasks, ticked-off tasks, a budget split, a day-of timeline and vendor updates,
  plus a short reply to say aloud. The server validates everything (numbers, dates, de-duplication, budget always sums to the total).
* **Default model:** `openai/gpt-oss-120b` (Apache 2.0 open weights) on Groq, retrying on `openai/gpt-oss-20b` if it's slow.
  **Runs on a laptop:** point it at Ollama with `gemma3` and nothing leaves the house (tested here with `gemma3:1b`).
* **ElevenLabs:** Scribe (`scribe_v1`) for speech-to-text, and `eleven_flash_v2_5` text-to-speech with the "Sarah" voice
  (mature, reassuring). Keys stay on the server; the browser only ever talks to `/api/*`.
* **Daily briefing:** one tap and it tells her how many days are left, what's overdue and the next three things due, out loud.
* **Offline helper:** if no model is reachable, a small rule-based parser still catches budgets, guest counts, months and
  "we booked the venue", and the UI says plainly that the model is offline.
* **Starting scaffold:** once the basics are known, a Nigerian-wedding checklist (matching family outfit fabric, the traditional engagement list, the head-tie artist, etc.)
  is laid out and squeezed to fit however much time is left; the model then adds to it and edits it.

## Part II: Voice RSVP

A guest opens `/rsvp`, taps the mic and says something like *"Na Tunde. I go come, but I no dey chop meat o."*
ElevenLabs Scribe transcribes it, and the open model pulls out a structured RSVP: name, attending, party size,
food needs as short English tags (Pidgin understood), language, and a note. The guest sees it as an editable card,
fixes anything, and sends it. An optional "Hear a thank-you" button speaks a short thank-you with ElevenLabs.
If the model is unreachable, a rule-based parser fills the card instead. Typing works too.

Cynthia's view is `/rsvp/list?key=RSVP_HOST_KEY`. It shows people coming (headcount), accepted, declined, replies, a
food-needs summary for the caterer, every reply, and a CSV download (`/api/rsvp/csv?key=...`).
If a guest RSVPs again under the same name, the latest answer wins.

## Part III: Voice Guestbook

Guests record a wish of up to 60 seconds at `/guestbook` (a gold ring shows the time left), or write one.
Scribe transcribes it, and the model gives it a theme (blessing or prayer, advice, funny, memory) and a short heading.
The keepsake page groups wishes by theme, with the written words and the original recording.
Cynthia can hide a wish from `/guestbook?key=RSVP_HOST_KEY`.

## Storage

`src/lib/store.ts` is a small adapter. Each RSVP, each wish and each recording is its own object, so two guests saving at the same time never overwrite each other.

* **Deployed:** a **Vercel Blob** store, private access. Set `BLOB_READ_WRITE_TOKEN`, which Vercel adds automatically when you connect a Blob store to the project. Recordings are streamed back through `/api/audio/[id]`, never exposed as public URLs.
* **Local development:** JSON files and audio in `./.data` (git-ignored), or wherever `DATA_DIR` points.
* On Vercel *without* a Blob token it falls back to `/tmp`, which is wiped between invocations. Don't ship like that.

## Run it

```bash
npm install
cp .env.example .env.local   # add ELEVENLABS_API_KEY and an LLM key
npm run dev                  # http://localhost:3000
```

Optional demo data (6 RSVPs and 5 written wishes, no ElevenLabs credits used, Groq tags the wishes):

```bash
npm run seed                 # BASE=http://localhost:3000 by default
```

End-to-end tests live in `scripts/` (`full.mjs`, `rsvp-mobile.mjs`, `shots.mjs`, `lock.mjs`). They need `playwright-core` and Chrome, and they expect the prod server on port 3200 with `RSVP_HOST_KEY=e2e-key`. Run them with `NO_TTS=1` to save credits.

### Run the brain locally with Ollama

```bash
ollama pull gemma3:4b        # or gemma3:1b on a small machine
LLM_BASE_URL=http://localhost:11434/v1 LLM_MODEL=gemma3:4b npm run dev
```

### Environment

| Var | Purpose |
| --- | --- |
| `ELEVENLABS_API_KEY` | Required for voice. Needs Speech-to-Text + Text-to-Speech access (Voices: read). |
| `ELEVENLABS_VOICE_ID` | Optional. Defaults to Sarah (`EXAVITQu4vr4xnSDxMaL`). |
| `ELEVENLABS_TTS_MODEL` / `ELEVENLABS_STT_MODEL` | Optional. Defaults `eleven_flash_v2_5` / `scribe_v1`. |
| `LLM_BASE_URL` | Any OpenAI-compatible endpoint. Default `https://api.groq.com/openai/v1`. |
| `LLM_API_KEY` | Key for that endpoint (falls back to `GROQ_API_KEY` for Groq). Not needed for Ollama. |
| `LLM_MODEL` | Default `openai/gpt-oss-120b` on Groq, `gemma3:1b` on Ollama. |
| `LLM_FALLBACK_MODEL` | Optional backup model. Default `openai/gpt-oss-20b` on Groq. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store (private) for RSVPs, wishes and recordings. Without it, files go in `.data/`. |
| `BLOB_ACCESS` | Optional. `private` (default) or `public`, and it must match the store's access setting. |
| `RSVP_HOST_KEY` | Cynthia's key for `/rsvp/list`, the CSV and hiding wishes. Open locally if unset; **locked on Vercel if unset**. |
| `DATA_DIR` | Optional local storage folder (default `./.data`). |

## Design

The look follows a save-the-date card Cynthia loved: ivory paper, beige alcohol-ink marble with rose-gold glitter veins,
an arched card with a hairline rose-gold border, and watercolor botanicals (cream roses, pampas, dried palm, eucalyptus, orchids).
All botanicals are hand-built SVG in `src/components/Botanicals.tsx` with a turbulence "watercolor" filter. No stock images.
Type is Cormorant Garamond, Great Vibes and Jost (self-hosted via Fontsource).

Motion: the arch rises on load, bouquets bloom in and sway, petals drift down, gold veins shimmer, text fades in on scroll,
and the mic is ringed by a live waveform of her voice while listening and of the planner's voice while speaking.
Everything respects `prefers-reduced-motion`.

## Credits used while building

ElevenLabs testing was kept tiny: about 190 credits in total across the planner, RSVP and guestbook tests (short Scribe clips plus 3 short TTS replies).
