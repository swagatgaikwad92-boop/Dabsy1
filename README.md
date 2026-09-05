# D.A.B.S.y

A small AI creature that lives on your desk — not a chatbot page, not a dashboard.
The home screen is just its eyes on a dark, atmospheric background. Everything else
(study mode, tasks, memory, settings, games) is hidden until you double‑tap it open.

## How to run it

**Option A — GitHub Pages**
1. Drag every file/folder in this bundle into the root of your GitHub repo
   (`yourmentorlyofficial-png/D.A.B.S.y-4` or wherever you're hosting it),
   preserving the folder structure exactly:
   ```
   index.html
   manifest.json
   sw.js
   assets/icons/...
   styles/...
   scripts/...
   README.md
   ```
2. Commit, then enable GitHub Pages (Settings → Pages → deploy from the branch you pushed to).
3. Open the resulting `https://username.github.io/repo/` URL. Everything uses
   relative paths, so it works fine under a subpath — no absolute `/` assumptions.

**Option B — any static host**
Any static file server works (Netlify, Vercel, a plain `python -m http.server`, etc.).
Nothing here needs a backend.

## First run

1. Open the app. You'll see D.A.B.s.y wake up — just the eyes, on black.
2. Tap once anywhere on the face to reveal the mic + text input.
3. Double‑tap the face to open its world: Room, Study, Utility, Play, Memory, Settings.
4. Go to **Settings** and paste your Gemini API key. It's stored only in this
   browser's `localStorage` (`dabsy_settings`) — never hard‑coded, never sent
   anywhere except directly to Google's API when you talk to D.A.B.s.y.

## Architecture

Each file has exactly one job, communicating only through a tiny event bus
(`window.DABSy.bus`) set up in `emotion-engine.js`. No engine reaches into another
engine's internals directly.

| File | Responsibility |
|---|---|
| `emotion-engine.js` | State machine (IDLE/LISTENING/THINKING/…), mood variables, event bus |
| `memory-engine.js` | Session / preferences / history / tasks / reminders / settings, all in `localStorage` |
| `face-engine.js` | Renders expressions, blinking, idle micro-looks, look-at, recoil |
| `interaction-engine.js` | Raw touch/pointer handling → tap / double-tap / long-press events |
| `voice-engine.js` | Speech recognition (listening) + speech synthesis (speaking) |
| `vision-engine.js` | Camera / screen-capture → single base64 frame, requested only on demand |
| `ai-engine.js` | Talks to Gemini (`gemini-3.6-flash`), exports `askDABSy()` |
| `pet-engine.js` | Continuity: neglect, affection, return-greetings, study-session reactions |
| `projection-engine.js` | Open/close choreography for the expanded World and the Study projection |
| `study-engine.js` | Turns a question/topic into step-by-step explanations in the projection surface |
| `utility-engine.js` | Timer, tasks, reminders |
| `entertainment-engine.js` | Small discoverable games (reaction test, guess the number, follow the eye) |
| `pwa-engine.js` | Service worker registration (relative path, GitHub Pages safe), install prompt |
| `app.js` | Wires voice ↔ AI ↔ face/subtitle together; renders Room, Memory, Settings panels |
| `boot.js` | Runs last — kicks off the wake-up animation |

## Notes on reliability

- The eyes and boot sequence render with **zero dependency on the AI key** —
  D.A.B.s.y is always alive even with no key set; it just tells you (once) that
  it needs one in Settings before it can actually think.
- If something looks wrong after an edit, check the browser console first —
  every engine logs failures there rather than failing silently.
- `manifest.json` icon filenames are `icon-192.png` / `icon-512.png` under
  `assets/icons/` — keep these exact names if you swap in your own artwork.

## What's next (not yet built)

- Gemini Live for true real-time bidirectional voice (current voice loop is
  browser SpeechRecognition + SpeechSynthesis, request/response rather than streaming)
- Left/right eye ecosystems as separate orbital menus (currently unified into
  the World's tab bar — Room / Study / Utility / Play / Memory / Settings)
- Secure AI gateway proxy (the API key currently lives in this browser's
  localStorage and calls Gemini directly, which is fine for personal/local use
  but not for a multi-user production deployment)
