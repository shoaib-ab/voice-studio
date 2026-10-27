import React, { useRef, useState } from 'react';
import {
  AudioLinesIcon,
  CheckCircle2Icon,
  DownloadIcon,
  MicIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SquareIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import { SearchableSelect, VoiceSelector } from '@/components/SearchableSelect';
import { PERSONALITY_PRESETS, SUPPORTED_LANGUAGES } from '@/data/taxonomy';
import { analyzeReferenceClip, formatDuration } from '@/utils/audioSynth';

const BABAR_SCRIPT_PRESETS = [
  {
    id: 'babar_urdu',
    label: 'Babar Azam · Urdu (اردو)',
    language: 'Urdu',
    text: 'الحمد للہ، لڑکوں نے آج بہت اچھی کرکٹ کھیلی۔ کرکٹ میں اتار چڑھاؤ آتا رہتا ہے، لیکن ہم اپنی غلطیوں سے سیکھ کر اگلے میچ میں ان شاء اللہ مضبوط کم بیک کریں گے۔',
  },
  {
    id: 'babar_bilingual',
    label: 'Babar Azam · Post-Match Mix',
    language: 'Urdu',
    text: 'Definitely, boys played really well tonight. مڈل آرڈر نے جس طرح پارٹنرشپ بلڈ کی، اس کا کریڈٹ پوری ٹیم کو جاتا ہے۔',
  },
  {
    id: 'babar_en',
    label: 'Babar Azam · English Interview',
    language: 'English',
    text: 'Definitely, credit goes to the boys. The way our bowlers executed their plans in the middle overs gave us momentum, and we will carry this confidence into the next game.',
  },
];

export function CloneWorkspace() {
  const {
    profiles,
    selectedVoiceId,
    setSelectedVoiceId,
    addProfile,
    updateProfile,
    cloneScript,
    setCloneScript,
    takes,
    createSynthesisTake,
    toggleStarTake,
    deleteTake,
    playAudio,
    activeTtsEngine,
    notify,
  } = useStudio();

  const activeProfile = profiles.find((p) => p.id === selectedVoiceId) || profiles[0];

  const [language, setLanguage] = useState<string>(activeProfile?.language || 'Urdu');
  const [selectedPersonality, setSelectedPersonality] = useState<string>('casual');
  const [customInstruct, setCustomInstruct] = useState<string>(
    activeProfile?.instruct ||
      'male, young adult, moderate pitch, calm pakistani urdu-english press conference cadence',
  );
  const [speed, setSpeed] = useState<number>(1.0);
  const [steps, setSteps] = useState<number>(32);
  const [guidance, setGuidance] = useState<number>(2.5);
  const [seed, setSeed] = useState<number>(42);
  const [watermarked, setWatermarked] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isAnalyzingRef, setIsAnalyzingRef] = useState<boolean>(false);

  // New Clone Reference Modal / Drawer state
  const [creatingClone, setCreatingClone] = useState<boolean>(false);
  const [newCloneName, setNewCloneName] = useState<string>('Babar Azam (Custom Interview Clip)');
  const [newCloneTranscript, setNewCloneTranscript] = useState<string>(
    'آپ کو اچھی پارٹنرشپ کرنی پڑتی ہے، اچھی پارٹنرشپ میں بولنگ کرنی پڑتی ہے، اس پارٹنرشپ کو جو ہے وہ لانگ لے کے جانا پڑتا ہے۔',
  );
  const [newCloneAudioUrl, setNewCloneAudioUrl] = useState<string>(
    '/assets/aistudio/babar-voice-sample_74691ef6.wav',
  );
  const [newCloneFileName, setNewCloneFileName] = useState<string>(
    'babar-voice-sample_74691ef6.wav',
  );
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickReplaceInputRef = useRef<HTMLInputElement>(null);

  const quickPersonalities = PERSONALITY_PRESETS.filter((p) => !p.is_demo);

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const dataUrl = await blobToDataUrl(blob);
        setNewCloneAudioUrl(dataUrl);
        setNewCloneFileName(`mic_reference_${Date.now().toString().slice(-4)}.webm`);
        stream.getTracks().forEach((t) => t.stop());
        setIsAnalyzingRef(true);
        notify('Analyzing & transcribing reference voice…');
        const analysis = await analyzeReferenceClip(blob, newCloneName);
        if (analysis) {
          setNewCloneTranscript(analysis.transcript);
          setCustomInstruct(analysis.instruct);
          if (analysis.detectedLanguage) setLanguage(analysis.detectedLanguage);
          notify('Reference voice transcribed & acoustic traits extracted');
        } else {
          notify('Reference audio captured');
        }
        setIsAnalyzingRef(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setNewCloneAudioUrl('/assets/aistudio/babar-ref-12s.wav');
      setNewCloneFileName('babar-voice-sample.m4a');
      notify('Loaded Babar Azam studio reference capture clip');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await blobToDataUrl(file);
    setNewCloneAudioUrl(dataUrl);
    setNewCloneFileName(file.name);
    if (!newCloneName.trim()) {
      setNewCloneName(file.name.replace(/\.[^.]+$/, ''));
    }
    setIsAnalyzingRef(true);
    notify(`Analyzing reference clip "${file.name}"…`);
    const analysis = await analyzeReferenceClip(file, newCloneName || file.name);
    if (analysis) {
      setNewCloneTranscript(analysis.transcript);
      setCustomInstruct(analysis.instruct);
      if (analysis.detectedLanguage) setLanguage(analysis.detectedLanguage);
      if (activeProfile && !creatingClone) {
        updateProfile(activeProfile.id, {
          audio_url: dataUrl,
          ref_text: analysis.transcript,
          instruct: analysis.instruct,
          language: analysis.detectedLanguage || activeProfile.language,
        });
      }
      notify(`Loaded & transcribed reference audio "${file.name}"`);
    } else {
      if (activeProfile && !creatingClone) {
        updateProfile(activeProfile.id, {
          audio_url: dataUrl,
        });
      }
      notify(`Loaded reference file "${file.name}"`);
    }
    setIsAnalyzingRef(false);
  };

  const handleSaveCloneProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCloneName.trim();
    if (!name) return;
    addProfile({
      name,
      kind: 'clone',
      language,
      ref_text: newCloneTranscript.trim(),
      instruct: customInstruct,
      personality: selectedPersonality,
      audio_url: newCloneAudioUrl,
      starred: true,
    });
    setCreatingClone(false);
  };

  const handleSynthesize = async () => {
    if (!cloneScript.trim() || !activeProfile || isSynthesizing) return;
    setIsSynthesizing(true);
    notify('Cloning voice from reference audio via k2-fsa/OmniVoice (8–15s)…');
    try {
      await createSynthesisTake({
        title: `${activeProfile.name} — ${cloneScript.trim().slice(0, 34)}…`,
        text: cloneScript.trim(),
        voiceId: activeProfile.id,
        voiceName: activeProfile.name,
        kind: 'clone',
        language,
        instruct: customInstruct || activeProfile.instruct,
        speed,
        steps,
        guidance,
        seed,
        watermarked,
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const wordCount = cloneScript.trim() ? cloneScript.trim().split(/\s+/).length : 0;
  const estSeconds = Math.max(1, Math.round((wordCount * 0.36) / speed));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Top Grid: Reference Voice Card + Script & Synthesis Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Reference Voice & Conditioning */}
        <div className="space-y-4 lg:col-span-5">
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MicIcon className="size-4 text-[#F47FA3]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  1. Voice Profile & Reference
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreatingClone((v) => !v)}
                className="flex items-center gap-1 rounded-md border border-[#F47FA3]/40 bg-[#F47FA3]/10 px-2.5 py-1 text-xs font-medium text-[#FFD0DB] hover:bg-[#F47FA3]/20"
              >
                <PlusIcon className="size-3.5" />
                <span>{creatingClone ? 'Close Form' : 'New Profile'}</span>
              </button>
            </div>

            <VoiceSelector
              profiles={profiles}
              value={activeProfile?.id || ''}
              onChange={(id) => {
                setSelectedVoiceId(id);
                const found = profiles.find((p) => p.id === id);
                if (found?.instruct) setCustomInstruct(found.instruct);
                if (found?.language) setLanguage(found.language);
                if (found?.ref_text) setCloneScript(found.ref_text);
              }}
              ariaLabel="Active Voice Profile"
            />

            {/* Direct Always-Visible Reference Audio Upload Bar */}
            <div className="mt-3 rounded-lg border border-dashed border-[#F47FA3]/40 bg-[#181324] p-3">
              <input
                ref={quickReplaceInputRef}
                type="file"
                accept="audio/*,video/*,.m4a,.wav,.mp3,.mp4,.webm"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-zinc-100">
                    Reference Audio Sample (Zero-Shot Input)
                  </div>
                  <div className="truncate text-[11px] text-emerald-400">
                    {isAnalyzingRef
                      ? 'Transcribing & extracting voice traits…'
                      : activeProfile?.id === 'clone_babar_azam'
                        ? 'Loaded: babar-voice-sample_74691ef6.wav (54.4s WAV · Auto-sliced 12s prompt)'
                        : `Active: ${newCloneFileName}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => quickReplaceInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-md bg-[#F47FA3] px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-xs transition-colors hover:bg-[#f693b2]"
                  >
                    <UploadIcon className="size-3.5" />
                    <span>Upload Reference Audio</span>
                  </button>
                </div>
              </div>
            </div>

            {activeProfile && !creatingClone && (
              <div className="mt-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
                      <span>{activeProfile.name}</span>
                      <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                        {activeProfile.kind === 'clone' ? 'Zero-Shot Clone' : 'Designed Voice'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      100% Acoustic Reference Prompt Conditioning (32 steps · CFG 2.5)
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeProfile.id === 'clone_babar_azam' && (
                      <button
                        type="button"
                        onClick={() =>
                          playAudio({
                            title: 'Babar Azam (Clean 8.2s Prompt Slice)',
                            subtitle: '24kHz Mono · 00:24.8–00:33.0 Reference Prompt',
                            audioUrl: '/api/reference/babar-clean.wav',
                            durationSec: 8.2,
                            peaks: [0.35, 0.65, 0.85, 0.6, 0.9, 0.7, 0.5, 0.8, 0.6, 0.4],
                          })
                        }
                        className="flex items-center gap-1 rounded-md border border-[#F47FA3]/40 bg-[#F47FA3]/10 px-2.5 py-1.5 text-xs font-medium text-[#FFD0DB] hover:bg-[#F47FA3]/20"
                      >
                        <PlayIcon className="size-3.5 fill-current text-[#F47FA3]" />
                        <span>8.2s Prompt</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        playAudio({
                          title: `${activeProfile.name} (Full Reference Audio)`,
                          subtitle: `${activeProfile.language} · Reference WAV`,
                          audioUrl: activeProfile.audio_url,
                          durationSec: activeProfile.id === 'clone_babar_azam' ? 54.4 : 12.0,
                          peaks: [0.3, 0.5, 0.85, 0.6, 0.9, 0.65, 0.4, 0.8, 0.55, 0.3],
                        })
                      }
                      className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-100 hover:border-[#F47FA3]/50 hover:text-white"
                    >
                      <PlayIcon className="size-3.5 fill-current text-[#F47FA3]" />
                      <span>Full Ref</span>
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 border-t border-zinc-800/70 pt-2 text-[11px] text-zinc-400">
                  <span className="font-medium text-zinc-300">Reference boundary transcript: </span>
                  “{activeProfile.ref_text}”
                </div>
              </div>
            )}

            {creatingClone && (
              <form
                onSubmit={handleSaveCloneProfile}
                className="mt-3 space-y-3 rounded-lg border border-[#F47FA3]/30 bg-[#171321] p-3.5"
              >
                <div className="text-xs font-semibold text-zinc-100">
                  Create Zero-Shot Clone Profile
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Profile Name</label>
                  <input
                    type="text"
                    required
                    value={newCloneName}
                    onChange={(e) => setNewCloneName(e.target.value)}
                    placeholder="e.g., Studio Narrator (Clean Mic)"
                    className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#F47FA3] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600"
                  >
                    <UploadIcon className="size-3.5 text-[#F7AE73]" />
                    <span>Upload Audio/Video</span>
                  </button>

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
                    >
                      <MicIcon className="size-3.5 text-rose-400" />
                      <span>Record Reference (3–15s)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="flex animate-pulse items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white"
                    >
                      <SquareIcon className="size-3.5 fill-current" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950/70 px-2.5 py-1.5 text-[11px] text-zinc-300">
                  <span className="truncate">Active clip: {newCloneFileName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      playAudio({
                        title: newCloneFileName,
                        subtitle: 'Reference Recording Preview',
                        audioUrl: newCloneAudioUrl,
                        durationSec: 5.0,
                        peaks: [0.4, 0.7, 0.6, 0.9, 0.5, 0.8, 0.4],
                      })
                    }
                    className="text-[#F47FA3] hover:underline"
                  >
                    Listen
                  </button>
                </div>

                <div>
                  <label className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Reference Transcript (ASR boundary)</span>
                    {isAnalyzingRef && (
                      <span className="animate-pulse text-[#F47FA3]">
                        Transcribing & extracting voice traits…
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    value={newCloneTranscript}
                    onChange={(e) => setNewCloneTranscript(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-100 focus:border-[#F47FA3] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatingClone(false)}
                    className="rounded-md px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-[#F47FA3] px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-[#f693b2]"
                  >
                    Save Voice Profile
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Personality & Conditioning Presets */}
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                2. Personality & Taxonomy Instruct
              </span>
              <span className="text-[11px] text-zinc-500">Validated tokens</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPersonalities.map((preset) => {
                const active = selectedPersonality === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.description}
                    onClick={() => {
                      setSelectedPersonality(preset.id);
                      setCustomInstruct(preset.instruct);
                    }}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#F47FA3]/50 bg-[#F47FA3]/15 text-[#FFD0DB]'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-[11px] text-zinc-400">
                Active Taxonomy Instruct String
              </label>
              <input
                type="text"
                value={customInstruct}
                onChange={(e) => setCustomInstruct(e.target.value)}
                placeholder="e.g. middle-aged, low pitch, british accent"
                className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 font-mono text-xs text-zinc-200 focus:border-[#F47FA3] focus:outline-none"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Script Editor & Synthesis Controls */}
        <div className="space-y-4 lg:col-span-7">
          <section className="flex flex-col rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AudioLinesIcon className="size-4 text-[#F7AE73]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  3. Synthesis Script
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Output Language:</span>
                <SearchableSelect
                  value={language}
                  onChange={setLanguage}
                  options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: l }))}
                  ariaLabel="Output Language"
                  size="sm"
                  className="w-40"
                />
              </div>
            </div>

            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-400">Quick Scripts:</span>
              {BABAR_SCRIPT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setCloneScript(preset.text);
                    setLanguage(preset.language);
                  }}
                  className="rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-[#F47FA3]/50 hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              value={cloneScript}
              onChange={(e) => setCloneScript(e.target.value)}
              dir={/[\u0600-\u06FF]/.test(cloneScript) ? 'auto' : undefined}
              placeholder="Enter text in Urdu (اردو), English, or any of 646 supported languages to synthesize with your selected voice…"
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950/80 p-3.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-[#F47FA3]/70 focus:outline-none"
            />

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <span>{wordCount} words</span>
                <span>·</span>
                <span>{cloneScript.length} chars</span>
                <span>·</span>
                <span>Est. ~{estSeconds}s audio</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
              >
                <SlidersHorizontalIcon className="size-3.5 text-[#F47FA3]" />
                <span>Production Overrides ({steps} steps · {speed}x)</span>
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3.5 sm:grid-cols-2">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Speech Speed</span>
                    <span className="font-mono text-zinc-200">{speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#F47FA3]"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Inference Steps</span>
                    <span className="font-mono text-zinc-200">{steps}</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={64}
                    step={2}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#F47FA3]"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">CFG Guidance Scale</span>
                    <span className="font-mono text-zinc-200">{guidance.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    value={guidance}
                    onChange={(e) => setGuidance(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#F47FA3]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-400">Deterministic Seed</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value) || 42)}
                      className="mt-1 h-7 w-full rounded border border-zinc-800 bg-zinc-950 px-2 font-mono text-xs text-zinc-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeed(Math.floor(Math.random() * 99999))}
                    title="Randomize seed"
                    className="mt-5 flex h-7 items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 hover:text-white"
                  >
                    <RefreshCwIcon className="size-3" />
                    <span>New</span>
                  </button>
                </div>
                <div className="col-span-full flex items-center justify-between border-t border-zinc-800/70 pt-2.5 text-xs">
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={watermarked}
                      onChange={(e) => setWatermarked(e.target.checked)}
                      className="accent-[#F47FA3]"
                    />
                    <ShieldCheckIcon className="size-3.5 text-emerald-400" />
                    <span>Embed imperceptible AI synthesis watermark (`mark_synthetic`)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSpeed(1.0);
                      setSteps(16);
                      setGuidance(2.0);
                      setSeed(42);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Reset defaults
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-3.5">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle2Icon className="size-4 text-emerald-400" />
                <span>
                  Engine: <strong className="text-zinc-200">{activeTtsEngine}</strong> (Zero-Shot Ready)
                </span>
              </div>
              <button
                type="button"
                disabled={isSynthesizing || !cloneScript.trim()}
                onClick={handleSynthesize}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] px-5 py-2 text-xs font-semibold text-zinc-950 shadow-md transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                <SparklesIcon className={`size-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
                <span>
                  {isSynthesizing
                    ? 'Cloning Voice from Reference (8–15s)…'
                    : 'Synthesize Speech'}
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Section: Recent Takes & Output History */}
      <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2Icon className="size-4 text-[#F47FA3]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Recent Synthesis Takes ({takes.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">Click any take to play in the bottom dock</span>
        </div>

        <div className="space-y-2">
          {takes.map((take) => (
            <div
              key={take.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800/70 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    playAudio({
                      title: take.title,
                      subtitle: `${take.voiceName} · ${take.language} · ${take.engine}`,
                      audioUrl: take.audioUrl,
                      durationSec: take.durationSec,
                      peaks: take.peaks,
                    })
                  }
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#241c33] text-[#F47FA3] hover:bg-[#F47FA3] hover:text-zinc-950"
                >
                  <PlayIcon className="size-4 fill-current" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-zinc-100">
                      {take.title}
                    </span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                      {take.voiceName}
                    </span>
                    <span className="rounded bg-zinc-800/70 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      {take.language}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{take.text}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[11px] text-zinc-400">
                  {formatDuration(take.durationSec)}
                </span>
                <button
                  type="button"
                  onClick={() => toggleStarTake(take.id)}
                  aria-label="Star take"
                  className={`rounded p-1.5 ${
                    take.starred ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <StarIcon className={`size-4 ${take.starred ? 'fill-current' : ''}`} />
                </button>
                <a
                  href={take.audioUrl}
                  download={`${take.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.wav`}
                  className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
                >
                  <DownloadIcon className="size-3.5" />
                  <span>WAV</span>
                </a>
                <button
                  type="button"
                  onClick={() => deleteTake(take.id)}
                  aria-label="Delete take"
                  className="rounded p-1.5 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
