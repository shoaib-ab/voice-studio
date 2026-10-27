import React, { useRef, useState } from 'react';
import {
  AlertTriangleIcon,
  AudioLinesIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FilmIcon,
  LinkIcon,
  PlayIcon,
  PlusIcon,
  ScissorsIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  Wand2Icon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import { SearchableSelect, VoiceSelector } from '@/components/SearchableSelect';
import { DUBBING_DEMO_MANIFEST } from '@/data/taxonomy';
import { formatTimecode, synthesizeSpeechWav } from '@/utils/audioSynth';
import type { DubSegment } from '@/types/voicestudio';

export function DubWorkspace() {
  const {
    profiles,
    dubProjects,
    activeDubId,
    updateDubProject,
    createStoryFromDub,
    playAudio,
    notify,
  } = useStudio();

  const project = dubProjects.find((p) => p.id === activeDubId) || dubProjects[0];
  const activeSegments = project.segmentsByLang[project.activeTargetLanguage] || [];

  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const dubbedVideoRef = useRef<HTMLVideoElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const srtUploadRef = useRef<HTMLInputElement>(null);

  const [activeSegId, setActiveSegId] = useState<string>(activeSegments[0]?.id || 'seg_1');
  const [urlInput, setUrlInput] = useState<string>('');
  const [showUrlForm, setShowUrlForm] = useState<boolean>(false);
  const [stylePrompt, setStylePrompt] = useState<string>(
    'Conversational delivery. Preserve idioms naturally, keep technical names unchanged, and match speaker timing.',
  );
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isGeneratingDub, setIsGeneratingDub] = useState<boolean>(false);

  const currentDubVideoUrl =
    project.dubbedVideoUrls[project.activeTargetLanguage] ||
    DUBBING_DEMO_MANIFEST.dubbed[0].video;

  const handleSyncPlayheads = () => {
    if (sourceVideoRef.current && dubbedVideoRef.current) {
      dubbedVideoRef.current.currentTime = sourceVideoRef.current.currentTime;
      notify('Synced original & dubbed video playheads');
    }
  };

  const handleMirrorSourceDelivery = () => {
    const directions = ['announcing', 'calm', 'energetic', 'urgent, quick', 'whispered'];
    updateDubProject(project.id, (prev) => {
      const lang = prev.activeTargetLanguage;
      const list = (prev.segmentsByLang[lang] || []).map((seg, idx) => ({
        ...seg,
        direction: seg.direction || directions[idx % directions.length],
      }));
      return {
        ...prev,
        segmentsByLang: {
          ...prev.segmentsByLang,
          [lang]: list,
        },
      };
    });
    notify('Mirrored source delivery prosody onto segment directions');
  };

  const handleTranslateAll = () => {
    setIsTranslating(true);
    setTimeout(() => {
      setIsTranslating(false);
      notify(
        `Translated ${activeSegments.length} segments to ${project.activeTargetLanguage} (${project.translateQuality} mode)`,
      );
    }, 450);
  };

  const handleGenerateDub = () => {
    setIsGeneratingDub(true);
    setTimeout(() => {
      setIsGeneratingDub(false);
      notify(
        `Rendered dubbed track for ${project.activeTargetLanguage} (${project.timingStrategy})`,
      );
    }, 600);
  };

  const handleSegmentUpdate = (segId: string, patch: Partial<DubSegment>) => {
    updateDubProject(project.id, (prev) => {
      const lang = prev.activeTargetLanguage;
      const nextList = (prev.segmentsByLang[lang] || []).map((s) =>
        s.id === segId ? { ...s, ...patch } : s,
      );
      return {
        ...prev,
        segmentsByLang: {
          ...prev.segmentsByLang,
          [lang]: nextList,
        },
      };
    });
  };

  const handleSplitSegment = (seg: DubSegment) => {
    const mid = Number(((seg.startSec + seg.endSec) / 2).toFixed(1));
    const words = seg.translatedText.split(' ');
    const half = Math.max(1, Math.floor(words.length / 2));
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ') || '...';

    updateDubProject(project.id, (prev) => {
      const lang = prev.activeTargetLanguage;
      const list = prev.segmentsByLang[lang] || [];
      const idx = list.findIndex((s) => s.id === seg.id);
      if (idx < 0) return prev;
      const nextList = [...list];
      nextList.splice(
        idx,
        1,
        { ...seg, endSec: mid, translatedText: firstHalf },
        {
          ...seg,
          id: `seg_${Date.now().toString(36)}`,
          startSec: mid,
          translatedText: secondHalf,
        },
      );
      return {
        ...prev,
        segmentsByLang: { ...prev.segmentsByLang, [lang]: nextList },
      };
    });
    notify('Split segment at midpoint');
  };

  const handleDeleteSegment = (segId: string) => {
    updateDubProject(project.id, (prev) => {
      const lang = prev.activeTargetLanguage;
      const nextList = (prev.segmentsByLang[lang] || []).filter((s) => s.id !== segId);
      return {
        ...prev,
        segmentsByLang: { ...prev.segmentsByLang, [lang]: nextList },
      };
    });
  };

  const handleAddSegment = () => {
    const last = activeSegments[activeSegments.length - 1];
    const startSec = last ? Number((last.endSec + 0.2).toFixed(1)) : 0.0;
    const endSec = Number((startSec + 3.0).toFixed(1));
    const newSeg: DubSegment = {
      id: `seg_${Date.now().toString(36)}`,
      speaker: 'Speaker 1',
      voiceId: profiles[0]?.id || 'demo_clone',
      startSec,
      endSec,
      sourceText: 'New dialogue cue.',
      translatedText: 'Nueva línea de diálogo.',
      direction: 'calm',
      speed: 1.0,
      gain: 1.0,
      fitStatus: 'ok',
    };
    updateDubProject(project.id, (prev) => {
      const lang = prev.activeTargetLanguage;
      return {
        ...prev,
        durationSec: Math.max(prev.durationSec, endSec + 0.5),
        segmentsByLang: {
          ...prev.segmentsByLang,
          [lang]: [...(prev.segmentsByLang[lang] || []), newSeg],
        },
      };
    });
    setActiveSegId(newSeg.id);
  };

  const handleExportSrt = () => {
    const srtLines = activeSegments
      .map((s, i) => {
        const fmt = (sec: number) => {
          const m = Math.floor(sec / 60);
          const rem = Math.floor(sec % 60);
          const ms = Math.round((sec % 1) * 1000);
          return `00:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')},${String(
            ms,
          ).padStart(3, '0')}`;
        };
        return `${i + 1}\n${fmt(s.startSec)} --> ${fmt(s.endSec)}\n${s.translatedText}\n`;
      })
      .join('\n');
    const blob = new Blob([srtLines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_${project.activeTargetLanguage}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${project.activeTargetLanguage} .srt sidecar subtitles`);
  };

  const handleImportSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const blocks = raw.trim().split(/\r?\n\r?\n/);
      const parsed: DubSegment[] = [];
      blocks.forEach((b, idx) => {
        const lines = b.split(/\r?\n/).map((l) => l.trim());
        const textLines = lines.filter(
          (l) => !/^\d+$/.test(l) && !l.includes('-->') && !l.startsWith('WEBVTT'),
        );
        if (textLines.length > 0) {
          parsed.push({
            id: `srt_${idx}`,
            speaker: 'Speaker 1',
            voiceId: profiles[0]?.id || 'demo_clone',
            startSec: idx * 3.5,
            endSec: (idx + 1) * 3.5 - 0.2,
            sourceText: textLines.join(' '),
            translatedText: textLines.join(' '),
            direction: '',
            speed: 1.0,
            gain: 1.0,
            fitStatus: 'ok',
          });
        }
      });
      if (parsed.length > 0) {
        updateDubProject(project.id, (prev) => ({
          ...prev,
          segmentsByLang: {
            ...prev.segmentsByLang,
            [prev.activeTargetLanguage]: parsed,
          },
        }));
        notify(`Imported ${parsed.length} subtitle cues from ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  // Detect any overlapping adjacent segments
  const overlapsCount = activeSegments.filter(
    (s, i) => i > 0 && s.startSec < activeSegments[i - 1].endSec,
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Setup & Production Sidebar (4 cols) */}
        <div className="space-y-4 lg:col-span-4">
          {/* Source Media Card */}
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilmIcon className="size-4 text-[#F47FA3]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  1. Source Video / Audio
                </h2>
              </div>
              <div className="flex gap-1.5">
                <input
                  ref={fileUploadRef}
                  type="file"
                  accept="video/*,audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const url = URL.createObjectURL(f);
                    updateDubProject(project.id, (prev) => ({
                      ...prev,
                      sourceFileName: f.name,
                      videoUrl: url,
                    }));
                    notify(`Loaded source media "${f.name}"`);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileUploadRef.current?.click()}
                  className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:text-white"
                >
                  <UploadIcon className="size-3" />
                  <span>Change file</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlForm((v) => !v)}
                  className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:text-white"
                >
                  <LinkIcon className="size-3" />
                  <span>Use link</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-800/90 bg-zinc-950/70 px-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="truncate font-medium text-zinc-100">{project.sourceFileName}</div>
                <div className="text-[11px] text-zinc-400">
                  {project.sourceLanguage} · {project.durationSec}s · Prepared
                </div>
              </div>
              <input
                ref={srtUploadRef}
                type="file"
                accept=".srt,.vtt"
                onChange={handleImportSrt}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => srtUploadRef.current?.click()}
                className="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-[#F47FA3]/50"
              >
                Import .srt
              </button>
            </div>

            {showUrlForm && (
              <div className="mt-2.5 flex gap-1.5">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="h-8 flex-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
                      notify('URL imports accept only http:// and https:// addresses');
                      return;
                    }
                    notify('Ingested remote video stream via yt-dlp pipeline');
                    setShowUrlForm(false);
                  }}
                  className="rounded bg-[#F47FA3] px-3 text-xs font-semibold text-zinc-950"
                >
                  Ingest
                </button>
              </div>
            )}
          </section>

          {/* Target Language & Translation Quality */}
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              2. Target Language & Translation
            </h2>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Active Target Track</label>
              <div className="grid grid-cols-2 gap-1.5">
                {project.targetLanguages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() =>
                      updateDubProject(project.id, (prev) => ({
                        ...prev,
                        activeTargetLanguage: lang,
                      }))
                    }
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      project.activeTargetLanguage === lang
                        ? 'border-[#F47FA3]/60 bg-[#F47FA3]/15 text-[#FFD0DB]'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Translation Quality Mode
              </label>
              <SearchableSelect
                value={project.translateQuality}
                onChange={(val) =>
                  updateDubProject(project.id, (prev) => ({
                    ...prev,
                    translateQuality: val as typeof prev.translateQuality,
                  }))
                }
                options={[
                  {
                    value: 'fast',
                    label: 'Fast (Direct NLLB / Argos neural translation)',
                  },
                  {
                    value: 'autofit',
                    label: 'Autofit (Syllable-budget aware translation)',
                  },
                  {
                    value: 'cinematic',
                    label: 'Cinematic (Context & character-voice aware)',
                  },
                  {
                    value: 'agent',
                    label: 'Translate with Agent (Local CLI / Style brief)',
                  },
                ]}
                ariaLabel="Translation Quality Mode"
                searchable={false}
              />
            </div>

            {project.translateQuality === 'agent' && (
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  Translation Style Prompt
                </label>
                <textarea
                  rows={2}
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  className="w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleTranslateAll}
              disabled={isTranslating}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-xs font-semibold text-zinc-100 hover:border-[#F47FA3]/50"
            >
              {isTranslating
                ? 'Translating segments…'
                : `Translate All (${project.activeTargetLanguage})`}
            </button>
          </section>

          {/* Timing & Smart Fit Speed Limits (#2896) */}
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              3. Timing & Background Mixing
            </h2>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Timing Strategy</label>
              <SearchableSelect
                value={project.timingStrategy}
                onChange={(val) =>
                  updateDubProject(project.id, (prev) => ({
                    ...prev,
                    timingStrategy: val as typeof prev.timingStrategy,
                  }))
                }
                options={[
                  { value: 'strict_slot', label: 'Strict Slot (Pitch-preserving slot fit)' },
                  { value: 'smart_fit', label: 'Smart Fit (Bounded rate + gap borrowing)' },
                  { value: 'concise', label: 'Concise (Rewrite overflow cues)' },
                  { value: 'stretch_video', label: 'Stretch Video (Retime video to speech)' },
                ]}
                ariaLabel="Timing Strategy"
                searchable={false}
              />
            </div>

            {project.timingStrategy === 'smart_fit' && (
              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Fastest speed (audio_rate_cap)</span>
                    <span className="font-mono text-zinc-200">
                      {project.smartFitFastCap.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    value={project.smartFitFastCap}
                    onChange={(e) =>
                      updateDubProject(project.id, (prev) => ({
                        ...prev,
                        smartFitFastCap: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full accent-[#F47FA3]"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Slowest speed (min_audio_rate)</span>
                    <span className="font-mono text-zinc-200">
                      {project.smartFitSlowCap.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.0}
                    step={0.05}
                    value={project.smartFitSlowCap}
                    onChange={(e) =>
                      updateDubProject(project.id, (prev) => ({
                        ...prev,
                        smartFitSlowCap: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full accent-[#F47FA3]"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={project.preserveBackground}
                onChange={(e) =>
                  updateDubProject(project.id, (prev) => ({
                    ...prev,
                    preserveBackground: e.target.checked,
                  }))
                }
                className="accent-[#F47FA3]"
              />
              <span>Preserve stereo sound outside dialogue intervals</span>
            </label>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleGenerateDub}
                disabled={isGeneratingDub}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] py-2 text-xs font-semibold text-zinc-950 shadow-md"
              >
                <SparklesIcon className="size-4" />
                <span>
                  {isGeneratingDub
                    ? 'Rendering Dubbed Track…'
                    : `Generate Dub (${project.activeTargetLanguage})`}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={currentDubVideoUrl}
                  download={`dubbed_${project.activeTargetLanguage}.mp4`}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
                >
                  <DownloadIcon className="size-3.5 text-[#F47FA3]" />
                  <span>Export MP4</span>
                </a>
                <button
                  type="button"
                  onClick={handleExportSrt}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
                >
                  <DownloadIcon className="size-3.5 text-[#F7AE73]" />
                  <span>Export .SRT</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Main Editor: Original/Dubbed Video Comparison + Timeline + Segments (8 cols) */}
        <div className="space-y-4 lg:col-span-8">
          {/* Side-by-Side Original vs Dubbed Video Player */}
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Original vs. Dubbed Comparison ({project.activeTargetLanguage})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncPlayheads}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
                >
                  Sync playheads
                </button>
                <button
                  type="button"
                  onClick={() => createStoryFromDub(project)}
                  className="flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
                  title="Send speakers and lines into the Stories editor"
                >
                  <AudioLinesIcon className="size-3.5" />
                  <span>Create Story</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-1.5 text-[11px]">
                  <span className="font-medium text-zinc-300">Original (English)</span>
                  <span className="text-zinc-500">source.mp4</span>
                </div>
                <video
                  ref={sourceVideoRef}
                  src={project.videoUrl}
                  controls
                  className="aspect-video w-full bg-black"
                />
              </div>

              <div className="overflow-hidden rounded-lg border border-[#F47FA3]/40 bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-1.5 text-[11px]">
                  <span className="font-medium text-[#FFD0DB]">
                    Dubbed ({project.activeTargetLanguage})
                  </span>
                  <span className="text-emerald-400">Fast-start MP4 Ready</span>
                </div>
                <video
                  ref={dubbedVideoRef}
                  src={currentDubVideoUrl}
                  controls
                  className="aspect-video w-full bg-black"
                />
              </div>
            </div>
          </section>

          {/* Proportional Timeline Lane */}
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-zinc-300">
                  Timeline & Cue Fit Lane
                </span>
                {overlapsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-300">
                    <AlertTriangleIcon className="size-3" />
                    <span>{overlapsCount} overlap detected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                    <CheckCircle2Icon className="size-3" />
                    <span>No cue overlaps</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMirrorSourceDelivery}
                  className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F7AE73]/60"
                  title="Measure source prosody and populate empty delivery directions"
                >
                  <Wand2Icon className="size-3.5 text-[#F7AE73]" />
                  <span>Mirror Source Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddSegment}
                  className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                >
                  <PlusIcon className="size-3.5" />
                  <span>Add Cue</span>
                </button>
              </div>
            </div>

            <div className="relative h-12 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              {activeSegments.map((seg) => {
                const total = Math.max(1, project.durationSec);
                const leftPct = Math.max(0, Math.min(98, (seg.startSec / total) * 100));
                const widthPct = Math.max(
                  4,
                  Math.min(100 - leftPct, ((seg.endSec - seg.startSec) / total) * 100),
                );
                const isSelected = seg.id === activeSegId;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setActiveSegId(seg.id)}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute bottom-1.5 top-1.5 flex flex-col justify-center overflow-hidden rounded border px-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#F47FA3] bg-[#F47FA3]/25 text-white z-10'
                        : 'border-zinc-700 bg-zinc-900/90 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    <span className="truncate text-[10px] font-semibold">{seg.speaker}</span>
                    <span className="truncate text-[9px] text-zinc-400">
                      {formatTimecode(seg.startSec)}–{formatTimecode(seg.endSec)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Segment Rows Editor */}
          <section className="space-y-2.5 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            {activeSegments.map((seg) => {
              const isSelected = seg.id === activeSegId;
              const assignedVoice = profiles.find((p) => p.id === seg.voiceId) || profiles[0];
              return (
                <div
                  key={seg.id}
                  onClick={() => setActiveSegId(seg.id)}
                  className={`rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-[#F47FA3]/60 bg-[#181324]'
                      : 'border-zinc-800/70 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                        {formatTimecode(seg.startSec)} → {formatTimecode(seg.endSec)}
                      </span>
                      <input
                        type="text"
                        value={seg.speaker}
                        onChange={(e) => handleSegmentUpdate(seg.id, { speaker: e.target.value })}
                        className="h-6 w-24 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs font-medium text-zinc-200"
                      />
                      <VoiceSelector
                        profiles={profiles}
                        value={seg.voiceId}
                        onChange={(voiceId) => handleSegmentUpdate(seg.id, { voiceId })}
                        size="sm"
                        className="w-48"
                      />
                      {seg.direction && (
                        <span className="rounded bg-[#F7AE73]/15 px-2 py-0.5 font-mono text-[10px] text-[#F7AE73]">
                          {seg.direction}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Audition segment speech"
                        onClick={(e) => {
                          e.stopPropagation();
                          const synth = synthesizeSpeechWav({
                            text: seg.translatedText,
                            instruct: assignedVoice?.instruct || seg.direction,
                            speed: seg.speed,
                          });
                          playAudio({
                            title: `${seg.speaker} (${project.activeTargetLanguage})`,
                            subtitle: `${formatTimecode(seg.startSec)}–${formatTimecode(seg.endSec)}`,
                            audioUrl: synth.audioUrl,
                            durationSec: synth.durationSec,
                            peaks: synth.peaks,
                          });
                        }}
                        className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:border-[#F47FA3]"
                      >
                        <PlayIcon className="size-3 fill-current text-[#F47FA3]" />
                        <span>Audition</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplitSegment(seg);
                        }}
                        title="Split cue"
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <ScissorsIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSegment(seg.id);
                        }}
                        title="Delete cue"
                        className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Source line dimmed above editable translation */}
                  <div className="mb-1.5 text-xs text-zinc-400">{seg.sourceText}</div>

                  <textarea
                    rows={2}
                    value={seg.translatedText}
                    onChange={(e) =>
                      handleSegmentUpdate(seg.id, { translatedText: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 p-2.5 text-sm text-zinc-100 focus:border-[#F47FA3] focus:outline-none"
                  />

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
                    <label className="flex items-center gap-1.5">
                      <span>Direction:</span>
                      <input
                        type="text"
                        value={seg.direction}
                        onChange={(e) => handleSegmentUpdate(seg.id, { direction: e.target.value })}
                        placeholder="e.g. urgent, whispered"
                        className="h-6 w-32 rounded border border-zinc-800 bg-zinc-950 px-2 font-mono text-[11px] text-zinc-200"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span>Speed: {seg.speed.toFixed(2)}x</span>
                      <input
                        type="range"
                        min={0.7}
                        max={1.6}
                        step={0.05}
                        value={seg.speed}
                        onChange={(e) =>
                          handleSegmentUpdate(seg.id, { speed: Number(e.target.value) })
                        }
                        className="w-20 accent-[#F47FA3]"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span>Gain: {Math.round(seg.gain * 100)}%</span>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.1}
                        value={seg.gain}
                        onChange={(e) =>
                          handleSegmentUpdate(seg.id, { gain: Number(e.target.value) })
                        }
                        className="w-20 accent-[#F47FA3]"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
