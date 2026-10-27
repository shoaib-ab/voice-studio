import React, { useState } from 'react';
import {
  BlocksIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CodeXmlIcon,
  CopyIcon,
  CpuIcon,
  DownloadIcon,
  FolderIcon,
  HardDriveIcon,
  LayersIcon,
  PhoneCallIcon,
  PlayIcon,
  PlusIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import { SearchableSelect, VoiceSelector } from '@/components/SearchableSelect';
import { SUPPORTED_LANGUAGES, describeVoiceToAttributes } from '@/data/taxonomy';
import { formatDuration } from '@/utils/audioSynth';

/* ── 1. Batch Dubbing Workspace (/batch) ───────────────────────────────── */
export function BatchWorkspace() {
  const { profiles, batchJobs, addBatchJob, cancelBatchJob, deleteBatchJob } = useStudio();
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['Español', 'Français']);
  const [voiceId, setVoiceId] = useState<string>(profiles[0]?.id || 'demo_clone');
  const [preserveBg, setPreserveBg] = useState<boolean>(true);
  const [fileNameInput, setFileNameInput] = useState<string>('tutorial_episode_04.mp4');
  const [tab, setTab] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const availableTargetLangs = ['Español', 'Français', '中文', '日本語', 'German', 'Portuguese', 'Hindi'];

  const toggleLang = (lang: string) => {
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const handleEnqueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileNameInput.trim() || selectedLangs.length === 0) return;
    addBatchJob({
      fileName: fileNameInput.trim(),
      fileSizeMb: Number((15 + Math.random() * 35).toFixed(1)),
      targetLanguages: selectedLangs,
      voiceId,
      preserveBackground: preserveBg,
    });
    setFileNameInput(`lecture_module_${Math.floor(Math.random() * 90 + 10)}.mp4`);
  };

  const filteredJobs = batchJobs.filter((j) => {
    if (tab === 'active') return j.status === 'running' || j.status === 'queued';
    if (tab === 'completed') return j.status === 'completed';
    if (tab === 'failed') return j.status === 'failed';
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <form
            onSubmit={handleEnqueue}
            className="space-y-3.5 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4"
          >
            <div className="flex items-center gap-2">
              <LayersIcon className="size-4 text-orange-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Add Videos to Batch Queue
              </h2>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Video Filename / Upload</label>
              <input
                type="text"
                value={fileNameInput}
                onChange={(e) => setFileNameInput(e.target.value)}
                className="h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Target Languages ({selectedLangs.length})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTargetLangs.map((lang) => {
                  const active = selectedLangs.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLang(lang)}
                      className={`rounded border px-2 py-1 text-[11px] font-medium ${
                        active
                          ? 'border-[#F47FA3]/50 bg-[#F47FA3]/15 text-[#FFD0DB]'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Voice Profile</label>
              <VoiceSelector profiles={profiles} value={voiceId} onChange={setVoiceId} />
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={preserveBg}
                onChange={(e) => setPreserveBg(e.target.checked)}
                className="accent-[#F47FA3]"
              />
              <span>Preserve background music & ambience</span>
            </label>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] py-2 text-xs font-semibold text-zinc-950"
            >
              <PlusIcon className="size-4" />
              <span>Add to Queue</span>
            </button>
          </form>
        </div>

        <div className="space-y-4 lg:col-span-8">
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Batch Dubbing Jobs ({batchJobs.length})
              </h2>
              <div className="flex gap-1 rounded-lg bg-zinc-900 p-0.5">
                {(
                  [
                    ['all', 'All'],
                    ['active', 'Active'],
                    ['completed', 'Completed'],
                    ['failed', 'Failed'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      tab === id ? 'bg-[#241d31] text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredJobs.map((job) => {
                const voice = profiles.find((p) => p.id === job.voiceId);
                return (
                  <div
                    key={job.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-100">{job.fileName}</span>
                          <span className="text-[11px] text-zinc-500">{job.fileSizeMb} MB</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                              job.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : job.status === 'running'
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {job.status} · {job.stage}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                          <span>Voice: {voice?.name || 'Default'}</span>
                          <span>·</span>
                          <span>Targets: {job.targetLanguages.join(', ')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {job.status === 'running' && (
                          <button
                            type="button"
                            onClick={() => cancelBatchJob(job.id)}
                            className="rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300"
                          >
                            Cancel
                          </button>
                        )}
                        {job.status === 'completed' && (
                          <a
                            href="/samples/demo/dubbing/dubbed_es.mp4"
                            download={`batch_${job.fileName}`}
                            className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F47FA3]"
                          >
                            <DownloadIcon className="size-3.5 text-[#F47FA3]" />
                            <span>Save Outputs</span>
                          </a>
                        )}
                        {job.status !== 'running' &&
                          (confirmDeleteId === job.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                deleteBatchJob(job.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded bg-rose-600 px-2 py-1 text-xs text-white"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(job.id)}
                              className="rounded p-1.5 text-zinc-500 hover:text-rose-400"
                            >
                              <Trash2Icon className="size-3.5" />
                            </button>
                          ))}
                      </div>
                    </div>

                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        style={{ width: `${job.progress}%` }}
                        className={`h-full transition-all ${
                          job.status === 'completed' ? 'bg-emerald-400' : 'bg-[#F47FA3]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Audio Tools Workspace (/tools) ─────────────────────────────────── */
export function ToolsWorkspace() {
  const { profiles, createSynthesisTake, notify } = useStudio();
  const [activeTool, setActiveTool] = useState<'convert' | 'director' | 'fit' | 'probe'>('convert');

  // Tool 1: Voice Convert
  const [convertVoiceId, setConvertVoiceId] = useState<string>(profiles[0]?.id || 'demo_clone');
  const [matchDuration, setMatchDuration] = useState<boolean>(true);
  const [convertTranscript, setConvertTranscript] = useState<string>(
    'Converted source clip speech rendered in the target voice profile while matching overall slot duration.',
  );

  // Tool 2: Directorial AI
  const [directionInput, setDirectionInput] = useState<string>(
    'Urgent, low-pitched British narrator speaking softly like a secret',
  );
  const parsedDirection = describeVoiceToAttributes(directionInput);

  // Tool 3: Speech-Rate Fit
  const [fitText, setFitText] = useState<string>(
    'VoiceStudio es una aplicación de escritorio para clonación de voz y doblaje de vídeo.',
  );
  const [fitDurationSec, setFitDurationSec] = useState<number>(4.2);
  const [fitLang, setFitLang] = useState<string>('Spanish');

  // Tool 4: FFprobe Inspector
  const [probePath, setProbePath] = useState<string>('/samples/demo/dubbing/source.mp4');
  const [probed, setProbed] = useState<boolean>(true);

  const syllableCount = Math.max(1, Math.round(fitText.trim().length / 2.8));
  const naturalDuration = Number((syllableCount * 0.21).toFixed(2));
  const requiredRate = fitDurationSec > 0 ? Number((naturalDuration / fitDurationSec).toFixed(2)) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <div className="flex items-center gap-2.5">
          <WrenchIcon className="size-5 text-yellow-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Audio & Production Utilities</h2>
            <p className="text-xs text-zinc-400">
              Voice Conversion, Directorial AI taxonomy parser, Speech-Rate Fit planner, and FFprobe
              stream inspector.
            </p>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {(
            [
              ['convert', 'Voice Convert'],
              ['director', 'Directorial AI'],
              ['fit', 'Speech-Rate Fit'],
              ['probe', 'Probe File (FFprobe)'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTool(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTool === id
                  ? 'bg-[#241d31] text-white ring-1 ring-[#F47FA3]/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTool === 'convert' && (
        <section className="space-y-4 rounded-xl border border-zinc-800/80 bg-[#110f17] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Voice Conversion (Source ASR → Target Clone/Design Profile)
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Target Voice Profile</label>
              <VoiceSelector
                profiles={profiles}
                value={convertVoiceId}
                onChange={setConvertVoiceId}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={matchDuration}
                  onChange={(e) => setMatchDuration(e.target.checked)}
                  className="accent-[#F47FA3]"
                />
                <span>Match source clip duration (time-stretch output to source length)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              Source Audio Transcript (Extracted via Faster-Whisper)
            </label>
            <textarea
              rows={3}
              value={convertTranscript}
              onChange={(e) => setConvertTranscript(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const voice = profiles.find((p) => p.id === convertVoiceId) || profiles[0];
              createSynthesisTake({
                title: `Voice Convert → ${voice.name}`,
                text: convertTranscript,
                voiceId: voice.id,
                voiceName: voice.name,
                kind: 'convert',
                language: voice.language,
                instruct: voice.instruct,
              });
              notify(`Converted audio into "${voice.name}" and saved to Takes History`);
            }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] px-5 py-2 text-xs font-semibold text-zinc-950"
          >
            <SparklesIcon className="size-4" />
            <span>Convert Audio & Play Result</span>
          </button>
        </section>
      )}

      {activeTool === 'director' && (
        <section className="space-y-4 rounded-xl border border-zinc-800/80 bg-[#110f17] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Directorial AI — Direction to Taxonomy & Rate Bias Parser
          </h3>
          <input
            type="text"
            value={directionInput}
            onChange={(e) => setDirectionInput(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="text-[11px] text-zinc-400">Validated TTS Instruct</div>
              <div className="mt-1 font-mono text-xs text-[#FFD0DB]">
                {parsedDirection.instruct || 'Auto (Neutral)'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="text-[11px] text-zinc-400">Speech-Rate Bias</div>
              <div className="mt-1 font-mono text-xs text-emerald-300">
                {directionInput.toLowerCase().includes('urgent') ||
                directionInput.toLowerCase().includes('quick')
                  ? '1.15x (+15% faster)'
                  : directionInput.toLowerCase().includes('slow')
                    ? '0.88x (-12% slower)'
                    : '1.00x (nominal)'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="text-[11px] text-zinc-400">Translation Tone Hint</div>
              <div className="mt-1 text-xs text-zinc-200">
                {parsedDirection.unmatched.join(', ') || 'Direct natural phrasing'}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTool === 'fit' && (
        <section className="space-y-4 rounded-xl border border-zinc-800/80 bg-[#110f17] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Speech-Rate Fit Planner (Slot Budget Analyzer)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Target Language</label>
              <SearchableSelect
                value={fitLang}
                onChange={setFitLang}
                options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: l }))}
                ariaLabel="Fit Target Language"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">
                Target Time Slot (Seconds, must be &gt; 0)
              </label>
              <input
                type="number"
                step={0.1}
                min={0.2}
                value={fitDurationSec}
                onChange={(e) => setFitDurationSec(Number(e.target.value))}
                className="h-8 w-full rounded border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-100"
              />
            </div>
          </div>
          <textarea
            rows={2}
            value={fitText}
            onChange={(e) => setFitText(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100"
          />
          {fitDurationSec <= 0 ? (
            <div className="text-xs text-rose-400">
              Invalid duration: time slot must be strictly positive.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs">
              <div>
                <div className="text-zinc-400">Estimated Syllables</div>
                <div className="mt-0.5 font-mono text-sm text-zinc-100">{syllableCount}</div>
              </div>
              <div>
                <div className="text-zinc-400">Natural Unstretched Length</div>
                <div className="mt-0.5 font-mono text-sm text-zinc-100">{naturalDuration}s</div>
              </div>
              <div>
                <div className="text-zinc-400">Required Speed Factor</div>
                <div
                  className={`mt-0.5 font-mono text-sm font-semibold ${
                    requiredRate <= 1.25
                      ? 'text-emerald-400'
                      : requiredRate <= 1.5
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {requiredRate}x ({requiredRate <= 1.25 ? 'Comfortable Fit' : 'Tight / Overflow'})
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTool === 'probe' && (
        <section className="space-y-4 rounded-xl border border-zinc-800/80 bg-[#110f17] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            FFprobe Media Container & Stream Inspector
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={probePath}
              onChange={(e) => setProbePath(e.target.value)}
              className="h-8 flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200"
            />
            <button
              type="button"
              onClick={() => {
                setProbed(true);
                notify(`Probed streams for ${probePath}`);
              }}
              className="rounded bg-[#F47FA3] px-4 text-xs font-semibold text-zinc-950"
            >
              Probe File
            </button>
          </div>
          {probed && (
            <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs text-zinc-300">
              {JSON.stringify(
                {
                  format: {
                    filename: probePath,
                    format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
                    duration: '12.840000',
                    bit_rate: '1428910',
                    fast_start: true,
                  },
                  streams: [
                    {
                      index: 0,
                      codec_type: 'video',
                      codec_name: 'h264',
                      width: 1280,
                      height: 720,
                      r_frame_rate: '30/1',
                    },
                    {
                      index: 1,
                      codec_type: 'audio',
                      codec_name: 'aac',
                      sample_rate: '48000',
                      channels: 2,
                      channel_layout: 'stereo',
                    },
                  ],
                },
                null,
                2,
              )}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}

/* ── 3. Voice Workflows & Calls Workspace (/calls) ─────────────────────── */
export function CallsWorkspace() {
  const { profiles, createSynthesisTake } = useStudio();
  const [agentVoiceId, setAgentVoiceId] = useState<string>('feat_librarian');
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are the VoiceStudio local conversational voice assistant. Keep responses concise, warm, and natural for spoken delivery.',
  );
  const [userMessage, setUserMessage] = useState<string>(
    'Can you summarize how local voice cloning works in two sentences?',
  );
  const [turns, setTurns] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    {
      role: 'agent',
      text: 'Hello! I am running on your local VoiceStudio speech pipeline. How can I help with your audio project today?',
    },
  ]);

  const handleSendTurn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessage.trim()) return;
    const msg = userMessage.trim();
    const reply =
      'VoiceStudio extracts speaker conditioning directly from a clean 5-second reference clip and synthesizes new speech in 646 languages on your hardware. No cloud subscription or external API keys are required.';
    setTurns((prev) => [...prev, { role: 'user', text: msg }, { role: 'agent', text: reply }]);
    setUserMessage('');

    const voice = profiles.find((p) => p.id === agentVoiceId) || profiles[0];
    createSynthesisTake({
      title: `Voice Agent Reply (${voice.name})`,
      text: reply,
      voiceId: voice.id,
      voiceName: voice.name,
      kind: 'clone',
      language: voice.language,
      instruct: voice.instruct,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="flex items-center gap-2">
              <PhoneCallIcon className="size-4 text-indigo-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Conversational Agent & Telephony Session
              </h2>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Agent Persona Voice</label>
              <VoiceSelector
                profiles={profiles}
                value={agentVoiceId}
                onChange={setAgentVoiceId}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Agent System Prompt</label>
              <textarea
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200"
              />
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] text-zinc-400">
              Pipeline: <strong className="text-zinc-200">sherpa-onnx ASR</strong> →{' '}
              <strong className="text-zinc-200">Local LLM / Agent</strong> →{' '}
              <strong className="text-zinc-200">OmniVoice Streaming TTS</strong>
            </div>
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="flex h-full flex-col justify-between rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Interactive Spoken Turn Simulator
              </h2>
              <div className="max-h-72 space-y-2.5 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                {turns.map((t, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-2.5 text-xs ${
                      t.role === 'user'
                        ? 'ml-8 bg-zinc-800 text-zinc-100'
                        : 'mr-8 border border-[#F47FA3]/30 bg-[#1b1426] text-zinc-100'
                    }`}
                  >
                    <div className="mb-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                      {t.role === 'user' ? 'Caller' : 'VoiceStudio Agent'}
                    </div>
                    {t.text}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendTurn} className="mt-3 flex gap-2">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Speak or type caller utterance…"
                className="h-9 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-[#F47FA3] px-4 text-xs font-semibold text-zinc-950"
              >
                <SendIcon className="size-3.5" />
                <span>Speak Turn</span>
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Projects & Render History Workspace (/projects) ────────────────── */
export function ProjectsWorkspace() {
  const { dubProjects, longformProjects, takes, playAudio, setRoute } = useStudio();
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(takes[0]?.id || null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Saved Workspace Projects */}
      <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <div className="flex items-center gap-2">
          <FolderIcon className="size-4 text-lime-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Saved Dubbing, Stories & Audiobook Projects
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {dubProjects.map((d) => (
            <div
              key={d.id}
              className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5"
            >
              <div>
                <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
                  Video Dubbing
                </span>
                <div className="mt-1.5 text-sm font-semibold text-zinc-100">{d.name}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Targets: {d.targetLanguages.join(', ')} · {d.timingStrategy}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoute('/dub')}
                className="mt-3 rounded-md border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F47FA3]"
              >
                Open in Dubbing
              </button>
            </div>
          ))}

          {longformProjects.map((lf) => (
            <div
              key={lf.id}
              className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5"
            >
              <div>
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 uppercase">
                  {lf.kind}
                </span>
                <div className="mt-1.5 text-sm font-semibold text-zinc-100">{lf.title}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  {lf.author} · {lf.outputFormat.toUpperCase()} · {lf.loudnessPreset.toUpperCase()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoute(lf.kind === 'stories' ? '/stories' : '/audiobook')}
                className="mt-3 rounded-md border border-zinc-700 bg-zinc-900 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F47FA3]"
              >
                Open Project
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Finished Renders with "How it was made" Recipe Inspector */}
      <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Finished Renders & “How It Was Made” Recipe Provenance ({takes.length})
        </h2>

        <div className="space-y-2.5">
          {takes.map((take) => {
            const expanded = expandedRecipeId === take.id;
            return (
              <div
                key={take.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        playAudio({
                          title: take.title,
                          subtitle: `${take.voiceName} · ${take.speed}x · ${take.engine}`,
                          audioUrl: take.audioUrl,
                          durationSec: take.durationSec,
                          peaks: take.peaks,
                        })
                      }
                      className="flex size-8 items-center justify-center rounded-full bg-[#241c33] text-[#F47FA3]"
                    >
                      <PlayIcon className="size-3.5 fill-current" />
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-zinc-100">{take.title}</div>
                      <div className="text-[11px] text-zinc-400">
                        {take.voiceName} · {take.speed}x · {take.engine} ·{' '}
                        {formatDuration(take.durationSec)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedRecipeId(expanded ? null : take.id)}
                    className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
                  >
                    <span>How it was made</span>
                    <ChevronDownIcon
                      className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {expanded && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-3 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-zinc-500">Voice:</span>{' '}
                      <span className="text-zinc-200">{take.voiceName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Engine:</span>{' '}
                      <span className="font-mono text-zinc-200">{take.engine}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Steps / CFG:</span>{' '}
                      <span className="font-mono text-zinc-200">
                        {take.steps} / {take.guidance}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Seed / Watermark:</span>{' '}
                      <span className="font-mono text-zinc-200">
                        #{take.seed} · {take.watermarked ? 'Marked' : 'Off'}
                      </span>
                    </div>
                    <div className="col-span-full font-mono text-[11px] text-[#F7AE73]">
                      Instruct: {take.instruct || 'Neutral reference conditioning'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ── 5. Local API & MCP Integrations Workspace (/integrations) ─────────── */
export function IntegrationsWorkspace() {
  const { notify } = useStudio();
  const [boundClients, setBoundClients] = useState<Record<string, boolean>>({
    'claude-desktop': true,
    cursor: true,
    windsurf: false,
    'claude-code': true,
  });

  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        voicestudio: {
          command: 'uv',
          args: ['run', 'python', '-m', 'backend.mcp_server'],
          env: {
            OMNIVOICE_PORT: '3900',
          },
        },
      },
    },
    null,
    2,
  );

  const curlExample = `curl -X POST http://127.0.0.1:3900/v1/audio/speech \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "omnivoice",
    "voice": "feat_librarian",
    "input": "Hello from the OpenAI-compatible local VoiceStudio endpoint!"
  }' --output speech.wav`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BlocksIcon className="size-4 text-emerald-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                MCP Server Agent Bindings (`backend/mcp_server.py`)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(mcpConfigJson);
                notify('Copied MCP server configuration JSON');
              }}
              className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
            >
              <CopyIcon className="size-3" />
              <span>Copy mcp.json</span>
            </button>
          </div>

          <div className="space-y-2">
            {[
              ['claude-desktop', 'Claude Desktop (claude_desktop_config.json)'],
              ['cursor', 'Cursor IDE (~/.cursor/mcp.json)'],
              ['windsurf', 'Windsurf (~/.codeium/windsurf/mcp_config.json)'],
              ['claude-code', 'Claude Code CLI (mcp add voicestudio)'],
            ].map(([id, label]) => (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs"
              >
                <span className="font-medium text-zinc-200">{label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setBoundClients((prev) => ({ ...prev, [id]: !prev[id] }));
                    notify(`Updated MCP binding for ${label}`);
                  }}
                  className={`rounded px-2.5 py-1 text-[11px] font-semibold ${
                    boundClients[id]
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {boundClients[id] ? 'Bound & Active' : 'Bind Client'}
                </button>
              </div>
            ))}
          </div>

          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {mcpConfigJson}
          </pre>
        </section>

        <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CodeXmlIcon className="size-4 text-[#F47FA3]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                OpenAI-Compatible Local Speech API (`/v1/audio/*`)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(curlExample);
                notify('Copied cURL snippet');
              }}
              className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
            >
              <CopyIcon className="size-3" />
              <span>Copy cURL</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400">
            Drop-in replacement for `/v1/audio/speech` and `/v1/audio/transcriptions` on port 3900
            with zero API keys required for localhost requests.
          </p>

          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {curlExample}
          </pre>
        </section>
      </div>
    </div>
  );
}

/* ── 6. Settings & Model Manager Workspace (/settings) ─────────────────── */
export function SettingsWorkspace() {
  const {
    models,
    installModel,
    removeModel,
    activeTtsEngine,
    setActiveTtsEngine,
    activeAsrEngine,
    setActiveAsrEngine,
    activeTranslationEngine,
    setActiveTranslationEngine,
    performanceTier,
    setPerformanceTier,
    notify,
  } = useStudio();

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TTS' | 'ASR' | 'Translation' | 'Diarisation'>(
    'ALL',
  );

  const filteredModels = models.filter((m) => roleFilter === 'ALL' || m.role === roleFilter);
  const installedDiskGb = models
    .filter((m) => m.installed)
    .reduce((sum, m) => sum + m.size_gb, 0)
    .toFixed(2);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Active Engines & Hardware Routing */}
      <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="size-4 text-[#F47FA3]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Active Engine Routing & Hardware Acceleration
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
            <CheckCircle2Icon className="size-3" />
            <span>Preflight Passed · FFmpeg Ready</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Speech Generation (TTS)</label>
            <SearchableSelect
              value={activeTtsEngine}
              onChange={setActiveTtsEngine}
              options={[
                { value: 'omnivoice', label: 'VoiceStudio (k2-fsa/OmniVoice)' },
                { value: 'cosyvoice-gguf', label: 'CosyVoice 3 GGUF (Vulkan/CUDA)' },
                { value: 'indextts', label: 'IndexTTS 2.5' },
                { value: 'audiocpp', label: 'audio.cpp (Breeze-TTS-2)' },
              ]}
              ariaLabel="TTS Engine"
              searchable={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Transcription (ASR)</label>
            <SearchableSelect
              value={activeAsrEngine}
              onChange={setActiveAsrEngine}
              options={[
                { value: 'faster-whisper', label: 'Faster-Whisper large-v3' },
                { value: 'whisperx', label: 'WhisperX (Aligned Timestamps)' },
                { value: 'sherpa-onnx', label: 'sherpa-onnx Parakeet TDT v3' },
                { value: 'moonshine', label: 'Moonshine ONNX (Edge/CPU)' },
              ]}
              ariaLabel="ASR Engine"
              searchable={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Translation Engine</label>
            <SearchableSelect
              value={activeTranslationEngine}
              onChange={setActiveTranslationEngine}
              options={[
                { value: 'nllb', label: 'NLLB-200 Distilled (Offline)' },
                { value: 'argos', label: 'Argos Translate (Offline)' },
                { value: 'agent', label: 'Local CLI Agent (Claude/Codex)' },
              ]}
              ariaLabel="Translation Engine"
              searchable={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">Compute Memory Profile</label>
            <SearchableSelect
              value={performanceTier}
              onChange={(v) => setPerformanceTier(v as typeof performanceTier)}
              options={[
                { value: 'balanced', label: 'Balanced (Keep active TTS warm)' },
                { value: 'high_quality', label: 'High Quality (32-step + resident)' },
                { value: 'low_vram', label: 'Low VRAM (Unload after synth)' },
              ]}
              ariaLabel="Performance Tier"
              searchable={false}
            />
          </div>
        </div>
      </section>

      {/* HuggingFace Model Catalog & License Inventory */}
      <section className="space-y-4 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Local Model Manager (`backend/config/models.yaml`)
            </h2>
            <p className="text-xs text-zinc-400">
              Explicit user-initiated model downloads with versioned license notices. Installed
              models use {installedDiskGb} GiB on disk.
            </p>
          </div>

          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
            {(['ALL', 'TTS', 'ASR', 'Translation', 'Diarisation'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  roleFilter === r
                    ? 'bg-[#241d31] text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredModels.map((m) => (
            <div
              key={m.repo_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-100">{m.label}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    {m.role}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">{m.size_gb} GiB</span>
                  {m.license && (
                    <span className="rounded bg-[#F7AE73]/15 px-1.5 py-0.5 text-[10px] text-[#F7AE73]">
                      License: {m.license}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{m.repo_id}</div>
                {m.note && <p className="mt-1 text-xs text-zinc-400">{m.note}</p>}
              </div>

              <div className="flex items-center gap-2">
                {m.installing ? (
                  <div className="w-32">
                    <div className="mb-1 flex justify-between text-[10px] text-[#F47FA3]">
                      <span>Downloading…</span>
                      <span>{m.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        style={{ width: `${m.progress}%` }}
                        className="h-full bg-[#F47FA3] transition-all"
                      />
                    </div>
                  </div>
                ) : m.installed ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                      <CheckCircle2Icon className="size-3.5" />
                      <span>Installed</span>
                    </span>
                    {!m.required && (
                      <button
                        type="button"
                        onClick={() => removeModel(m.repo_id)}
                        className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:text-rose-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => installModel(m.repo_id)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#F47FA3] px-3 py-1.5 text-xs font-semibold text-zinc-950"
                  >
                    <DownloadIcon className="size-3.5" />
                    <span>Install ({m.size_gb} GiB)</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
