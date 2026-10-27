# VoiceStudio (React Web Application)

Open-source voice cloning, voice design, video dubbing, dictation, transcription, and audiobook creation across 646 languages.

## Features

- **Voice Cloning (`/clone`)**: Zero-shot voice cloning with reference audio upload, live microphone capture, local reference boundary transcript, personality presets, and production overrides (`steps`, `guidance`, `speed`, `seed`, `mark_synthetic` AI watermark).
- **Voice Design (`/design`)**: Deterministic local natural-language-to-taxonomy mapper (`Gender`, `Age`, `Pitch`, `Style`, `EnglishAccent`, `ChineseDialect`), locked identity seed, 7 bundled voice design showcases with real audio previews, and profile saving.
- **Voice Gallery & Personas (`/gallery`, `/personas`)**: Over 300 Featured and combinatorial designed voice archetypes across 7 use-case categories (`Narration & Story`, `Conversational`, `Characters & Animation`, `Social Media`, `Entertainment & TV`, `Advertisement`, `Informative & Educational`), facet filtering, and portable `.ovsvoice` bundle import/export.
- **Video Dubbing (`/dub`)**: Side-by-side Original vs. Dubbed video comparison player (English, Español, Français, 中文, 日本語), proportional cue timeline with overlap QC, Smart Fit speed limits (`audio_rate_cap`, `min_audio_rate`), Mirror Source Delivery prosody analysis, `.srt` subtitle import/export, and Create Story handoff.
- **Stories & Audiobook Studio (`/stories`, `/audiobook`)**: Multi-character cast management, screenplay/Markdown Auto-Cast, `# Chapter` markers, two-pass ACX/Podcast loudness presets, pronunciation lexicon with duplicate detection, M4B/MP3 rendering, and `HH:MM:SS<TAB>Title` chapter cue sheet export.
- **Live Dictation & Transcriptions (`/transcriptions`)**: Live capture and audio file transcription with deterministic local text cleanup (filler removal, spoken punctuation, sentence casing), timed segments, `.txt` export, and Clone script handoff.
- **Batch Dubbing, Audio Tools, Calls, Projects & MCP (`/batch`, `/tools`, `/calls`, `/projects`, `/integrations`, `/settings`)**: Multi-language batch queue, Voice Convert, Directorial AI, Speech-Rate Fit planner, FFprobe stream inspector, conversational voice agent simulator, OpenAI-compatible local speech API snippets, MCP Server bindings, and HuggingFace Model Manager.

## Development

```bash
npm install
npm run dev
```

Runs the Vite development server on `http://0.0.0.0:3000`.
