import React, { useRef, useState } from 'react';
import {
  ArrowRightIcon,
  CopyIcon,
  DownloadIcon,
  MicIcon,
  PlayIcon,
  SearchIcon,
  SparklesIcon,
  SquareIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import { SearchableSelect } from '@/components/SearchableSelect';
import { SUPPORTED_LANGUAGES, cleanDictatedText } from '@/data/taxonomy';
import { formatDuration, formatTimecode } from '@/utils/audioSynth';

export function TranscriptionsWorkspace() {
  const {
    transcriptions,
    addTranscription,
    deleteTranscription,
    clearTranscriptions,
    setCloneScript,
    setRoute,
    activeAsrEngine,
    playAudio,
    notify,
  } = useStudio();

  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [liveDraft, setLiveDraft] = useState<string>(
    'uh i wanted to test the live sherpa onnx dictation pipeline comma and see how spoken punctuation and filler removal work in real time period',
  );
  const [language, setLanguage] = useState<string>('English');
  const [removeFillers, setRemoveFillers] = useState<boolean>(true);
  const [spokenPunctuation, setSpokenPunctuation] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  const previewCleaned = cleanDictatedText(liveDraft, {
    removeFillers,
    spokenPunctuation,
  });

  const handleToggleDictation = () => {
    if (!isDictating) {
      setIsDictating(true);
      notify('Live Dictation active (mono 16 kHz PCM capture)');
    } else {
      setIsDictating(false);
      if (liveDraft.trim()) {
        addTranscription({
          fileName: `live_dictation_${new Date().toLocaleTimeString()}.wav`,
          language,
          engine: activeAsrEngine,
          rawText: liveDraft.trim(),
          cleanedText: previewCleaned,
          durationSec: 6.2,
          audioUrl: '/samples/dictation/en_conversational.wav',
          segments: [
            {
              id: `seg_${Date.now()}`,
              startSec: 0.0,
              endSec: 6.2,
              text: previewCleaned,
              speaker: 'Speaker 1',
            },
          ],
        });
        notify('Saved dictated utterance to Transcription History');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const sampleRaw = `Transcribed audio from ${file.name} using ${activeAsrEngine} with word-level timestamps.`;
    addTranscription({
      fileName: file.name,
      language,
      engine: activeAsrEngine,
      rawText: sampleRaw,
      cleanedText: cleanDictatedText(sampleRaw, { removeFillers, spokenPunctuation }),
      durationSec: 8.4,
      audioUrl: url,
      segments: [
        {
          id: `seg_up_${Date.now()}`,
          startSec: 0.0,
          endSec: 8.4,
          text: sampleRaw,
          speaker: 'Speaker 1',
        },
      ],
    });
    notify(`Transcribed "${file.name}" with ${activeAsrEngine}`);
  };

  const handleExportTxt = (item: (typeof transcriptions)[0]) => {
    const content = [
      `# VoiceStudio Transcription Export`,
      `File: ${item.fileName}`,
      `Language: ${item.language} | Engine: ${item.engine}`,
      `Date: ${item.createdAt}`,
      ``,
      `## Cleaned Transcript`,
      item.cleanedText,
      ``,
      `## Timed Segments`,
      ...item.segments.map(
        (s) => `[${formatTimecode(s.startSec)} -> ${formatTimecode(s.endSec)}] ${s.text}`,
      ),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.fileName.replace(/\.[^.]+$/, '')}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported dated transcript for ${item.fileName}`);
  };

  const filteredHistory = transcriptions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.fileName.toLowerCase().includes(q) ||
      t.cleanedText.toLowerCase().includes(q) ||
      t.rawText.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Live Dictation & File Upload Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MicIcon className="size-4 text-teal-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Dictation & ASR Capture
                </h2>
              </div>
              <span className="rounded bg-teal-500/15 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                {activeAsrEngine}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Spoken Language</label>
              <SearchableSelect
                value={language}
                onChange={setLanguage}
                options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: l }))}
                ariaLabel="Dictation Spoken Language"
              />
            </div>

            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs">
              <div className="font-medium text-zinc-200">
                Deterministic Local Text Cleanup (Zero LLM required)
              </div>
              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={removeFillers}
                  onChange={(e) => setRemoveFillers(e.target.checked)}
                  className="accent-[#F47FA3]"
                />
                <span>Remove hesitations (“uh”, “umm”) and short-word stutters</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={spokenPunctuation}
                  onChange={(e) => setSpokenPunctuation(e.target.checked)}
                  className="accent-[#F47FA3]"
                />
                <span>Spoken punctuation (“comma”, “period”, “question mark”)</span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleToggleDictation}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                  isDictating
                    ? 'animate-pulse bg-rose-600 text-white'
                    : 'bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] text-zinc-950'
                }`}
              >
                {isDictating ? (
                  <>
                    <SquareIcon className="size-3.5 fill-current" />
                    <span>Stop & Transcribe</span>
                  </>
                ) : (
                  <>
                    <MicIcon className="size-4" />
                    <span>Start Dictation</span>
                  </>
                )}
              </button>

              <input
                ref={fileUploadRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileUploadRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-600"
              >
                <UploadIcon className="size-3.5 text-[#F7AE73]" />
                <span>Upload Audio</span>
              </button>
            </div>
          </section>
        </div>

        {/* Live Cleanup Sandbox */}
        <div className="lg:col-span-7">
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Live Utterance Stream & Deterministic Cleanup Preview
              </h2>
              <button
                type="button"
                onClick={() => {
                  addTranscription({
                    fileName: `utterance_${Date.now().toString().slice(-4)}.wav`,
                    language,
                    engine: activeAsrEngine,
                    rawText: liveDraft,
                    cleanedText: previewCleaned,
                    durationSec: 5.4,
                    audioUrl: '/samples/dictation/en_conversational.wav',
                    segments: [
                      {
                        id: `s_${Date.now()}`,
                        startSec: 0,
                        endSec: 5.4,
                        text: previewCleaned,
                        speaker: 'Speaker 1',
                      },
                    ],
                  });
                  notify('Saved utterance to History');
                }}
                className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Save to History
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Raw Streaming ASR Output (Editable test input)
              </label>
              <textarea
                rows={3}
                value={liveDraft}
                onChange={(e) => setLiveDraft(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-300 focus:border-[#F47FA3] focus:outline-none"
              />
            </div>

            <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-teal-300">
                <span className="flex items-center gap-1 font-medium">
                  <SparklesIcon className="size-3.5" /> Cleaned Output
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(previewCleaned);
                    notify('Copied cleaned transcript to clipboard');
                  }}
                  className="flex items-center gap-1 text-zinc-300 hover:text-white"
                >
                  <CopyIcon className="size-3" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-sm font-medium text-zinc-100">{previewCleaned}</p>
            </div>
          </section>
        </div>
      </div>

      {/* History List (`omni_transcriptions` format) */}
      <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Transcription History ({transcriptions.length} / 200)
          </h2>

          {transcriptions.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transcripts…"
                  className="h-7 rounded-md border border-zinc-800 bg-zinc-900 pl-8 pr-2.5 text-xs text-zinc-100"
                />
              </div>
              {!confirmClearAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:text-rose-400"
                >
                  Clear All
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearTranscriptions();
                      setConfirmClearAll(false);
                    }}
                    className="rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white"
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="text-xs text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {item.audioUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        playAudio({
                          title: item.fileName,
                          subtitle: `${item.language} · ${item.engine}`,
                          audioUrl: item.audioUrl!,
                          durationSec: item.durationSec,
                          peaks: [0.35, 0.75, 0.6, 0.85, 0.5, 0.8, 0.45],
                        })
                      }
                      className="flex size-8 items-center justify-center rounded-full bg-[#241c33] text-[#F47FA3] hover:bg-[#F47FA3] hover:text-zinc-950"
                    >
                      <PlayIcon className="size-3.5 fill-current" />
                    </button>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-100">{item.fileName}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                        {item.language}
                      </span>
                      <span className="rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] text-teal-300">
                        {item.engine}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Duration: {formatDuration(item.durationSec)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCloneScript(item.cleanedText);
                      setRoute('/clone');
                      notify('Sent transcript to Voice Cloning script');
                    }}
                    className="flex items-center gap-1 rounded-md border border-[#F47FA3]/40 bg-[#F47FA3]/10 px-2.5 py-1 text-xs font-medium text-[#FFD0DB] hover:bg-[#F47FA3]/20"
                  >
                    <span>Send to Clone Script</span>
                    <ArrowRightIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportTxt(item)}
                    className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
                  >
                    <DownloadIcon className="size-3.5" />
                    <span>Export .txt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTranscription(item.id)}
                    className="rounded p-1.5 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </div>

              <p className="mt-2.5 text-sm leading-relaxed text-zinc-100">{item.cleanedText}</p>

              {item.rawText !== item.cleanedText && (
                <div className="mt-2 rounded border border-zinc-800/70 bg-zinc-950/60 px-2.5 py-1.5 text-[11px] text-zinc-400">
                  <span className="font-medium text-zinc-300">Raw ASR: </span>
                  {item.rawText}
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {item.segments.map((seg) => (
                  <span
                    key={seg.id}
                    className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[10px] text-zinc-400"
                  >
                    [{formatTimecode(seg.startSec)} – {formatTimecode(seg.endSec)}] {seg.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
