import React, { useState } from 'react';
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  AudioLinesIcon,
  BookOpenIcon,
  DownloadIcon,
  FileTextIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UsersRoundIcon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import { SearchableSelect, VoiceSelector } from '@/components/SearchableSelect';
import { SUPPORTED_LANGUAGES } from '@/data/taxonomy';
import { synthesizeSpeechWav } from '@/utils/audioSynth';
import type { StoryLine } from '@/types/voicestudio';

export function StoriesWorkspace({ mode = 'stories' }: { mode?: 'stories' | 'audiobook' }) {
  const {
    profiles,
    longformProjects,
    updateLongformProject,
    createSynthesisTake,
    playAudio,
    notify,
  } = useStudio();

  const projectId = mode === 'stories' ? 'story_default' : 'audiobook_default';
  const project =
    longformProjects.find((p) => p.id === projectId) || longformProjects[0];

  const [newCharName, setNewCharName] = useState<string>('');
  const [newCharVoiceId, setNewCharVoiceId] = useState<string>(profiles[0]?.id || 'demo_clone');
  const [importBuffer, setImportBuffer] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);
  const [newPronWord, setNewPronWord] = useState<string>('');
  const [newPronReplace, setNewPronReplace] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);

  // Detect duplicate pronunciation words
  const seenPronWords = new Set<string>();
  let duplicatePronWord: string | null = null;
  for (const entry of project.pronunciations) {
    const lower = entry.word.trim().toLowerCase();
    if (seenPronWords.has(lower)) {
      duplicatePronWord = entry.word;
      break;
    }
    seenPronWords.add(lower);
  }

  const handleAddCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCharName.trim();
    if (!name) return;
    const palette = ['#F47FA3', '#F7AE73', '#38bdf8', '#a78bfa', '#34d399', '#fbbf24'];
    updateLongformProject(project.id, (prev) => ({
      ...prev,
      characters: [
        ...prev.characters,
        {
          id: `char_${Date.now().toString(36)}`,
          name,
          voiceId: newCharVoiceId,
          color: palette[prev.characters.length % palette.length],
        },
      ],
    }));
    setNewCharName('');
    notify(`Added character "${name}" to Cast`);
  };

  const handleAutoCastBuffer = () => {
    const raw = importBuffer.trim();
    if (!raw) return;
    const rawLines = raw.split(/\r?\n/).filter((l) => l.trim());
    const parsedLines: StoryLine[] = [];

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        parsedLines.push({
          id: `line_imp_${Date.now()}_${idx}`,
          type: 'chapter',
          characterId: project.characters[0]?.id || 'char_narrator',
          text: trimmed,
        });
        return;
      }
      const speakerMatch = trimmed.match(/^([A-Za-z0-9 _-]{2,24}):\s*(.+)$/);
      if (speakerMatch) {
        const spName = speakerMatch[1].trim();
        const spoken = speakerMatch[2].trim();
        const foundChar =
          project.characters.find((c) => c.name.toLowerCase() === spName.toLowerCase()) ||
          project.characters[0];
        parsedLines.push({
          id: `line_imp_${Date.now()}_${idx}`,
          type: 'line',
          characterId: foundChar?.id || 'char_narrator',
          text: spoken,
        });
      } else {
        parsedLines.push({
          id: `line_imp_${Date.now()}_${idx}`,
          type: 'line',
          characterId: project.characters[0]?.id || 'char_narrator',
          text: trimmed,
        });
      }
    });

    updateLongformProject(project.id, (prev) => ({
      ...prev,
      lines: [...prev.lines, ...parsedLines],
    }));
    setImportBuffer('');
    setShowImportBox(false);
    notify(`Auto-cast ${parsedLines.length} lines into Stories script`);
  };

  const handleMoveLine = (idx: number, dir: -1 | 1) => {
    updateLongformProject(project.id, (prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.lines.length) return prev;
      const next = [...prev.lines];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return { ...prev, lines: next };
    });
  };

  const handleAuditionLine = (line: StoryLine) => {
    const char = project.characters.find((c) => c.id === line.characterId);
    const voice =
      profiles.find((p) => p.id === (char?.voiceId || project.defaultVoiceId)) || profiles[0];
    if (line.audioUrl) {
      playAudio({
        title: `${char?.name || 'Narrator'} — Line Audition`,
        subtitle: `${voice.name} · ${line.speedOverride || project.globalSpeed}x`,
        audioUrl: line.audioUrl,
        durationSec: 6.2,
        peaks: [0.35, 0.7, 0.5, 0.9, 0.6, 0.8, 0.45],
      });
    } else {
      const synth = synthesizeSpeechWav({
        text: line.text,
        instruct: voice?.instruct,
        speed: line.speedOverride || project.globalSpeed,
      });
      playAudio({
        title: `${char?.name || 'Narrator'} — Line Audition`,
        subtitle: `${voice?.name || 'Default'} · ${line.speedOverride || project.globalSpeed}x`,
        audioUrl: synth.audioUrl,
        durationSec: synth.durationSec,
        peaks: synth.peaks,
      });
    }
  };

  const handleRenderProject = () => {
    if (duplicatePronWord) return;
    setIsRendering(true);
    setRenderProgress(18);
    const fullText =
      mode === 'stories'
        ? project.lines
            .filter((l) => l.type === 'line')
            .map((l) => l.text)
            .join(' ')
        : project.manuscript;
    const defaultVoice =
      profiles.find((p) => p.id === project.defaultVoiceId) || profiles[0];

    setTimeout(() => setRenderProgress(56), 250);
    setTimeout(() => setRenderProgress(88), 500);
    setTimeout(() => {
      const take = createSynthesisTake({
        title: `${project.title} (${project.outputFormat.toUpperCase()} Master)`,
        text: fullText.slice(0, 260) || project.title,
        voiceId: defaultVoice.id,
        voiceName: defaultVoice.name,
        kind: mode === 'stories' ? 'story' : 'audiobook',
        language: project.language,
        instruct: defaultVoice.instruct,
        speed: project.globalSpeed,
        presetAudioUrl: project.lastRenderUrl,
      });
      updateLongformProject(project.id, (prev) => ({
        ...prev,
        lastRenderUrl: take.audioUrl,
        lastRenderDurationSec: take.durationSec,
      }));
      setIsRendering(false);
      setRenderProgress(100);
      notify(
        `Rendered ${project.title} (${project.loudnessPreset.toUpperCase()} loudness · ${project.outputFormat.toUpperCase()})`,
      );
    }, 800);
  };

  const handleExportCueSheet = () => {
    const chapters =
      mode === 'stories'
        ? project.lines.filter((l) => l.type === 'chapter').map((l) => l.text.replace(/^#+\s*/, ''))
        : (project.manuscript.match(/^#\s+.+$/gm) || ['Chapter 1']).map((h) =>
            h.replace(/^#\s+/, ''),
          );
    const content = chapters
      .map((title, idx) => {
        const secs = idx * 42;
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        return `00:${mm}:${ss}\t${title}`;
      })
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_chapters.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported HH:MM:SS<TAB>Title chapter cue sheet (.txt)');
  };

  const chaptersParsed = (project.manuscript.match(/^#\s+.+$/gm) || []).map((h) =>
    h.replace(/^#\s+/, ''),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Setup, Cast & Mastering Pane (4 cols) */}
        <div className="space-y-4 lg:col-span-4">
          {/* Fixed Setup Card */}
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="flex items-center gap-2">
              {mode === 'stories' ? (
                <AudioLinesIcon className="size-4 text-sky-400" />
              ) : (
                <BookOpenIcon className="size-4 text-amber-400" />
              )}
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {mode === 'stories' ? 'Story Setup & Global Speed' : 'Audiobook Setup & Format'}
              </h2>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Title</label>
              <input
                type="text"
                value={project.title}
                onChange={(e) =>
                  updateLongformProject(project.id, (prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">Default Narrator Voice</label>
              <VoiceSelector
                profiles={profiles}
                value={project.defaultVoiceId}
                onChange={(defaultVoiceId) =>
                  updateLongformProject(project.id, (prev) => ({ ...prev, defaultVoiceId }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Language</label>
                <SearchableSelect
                  value={project.language}
                  onChange={(language) =>
                    updateLongformProject(project.id, (prev) => ({ ...prev, language }))
                  }
                  options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: l }))}
                  ariaLabel="Book Language"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Output Format</label>
                <SearchableSelect
                  value={project.outputFormat}
                  onChange={(val) =>
                    updateLongformProject(project.id, (prev) => ({
                      ...prev,
                      outputFormat: val as typeof prev.outputFormat,
                    }))
                  }
                  options={[
                    { value: 'm4b', label: 'M4B (Embedded Chapters)' },
                    { value: 'mp3', label: 'MP3 (Stereo 192k)' },
                    { value: 'wav', label: 'WAV (Lossless PCM)' },
                  ]}
                  ariaLabel="Output Format"
                  searchable={false}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  Two-Pass Loudness Preset
                </label>
                <SearchableSelect
                  value={project.loudnessPreset}
                  onChange={(val) =>
                    updateLongformProject(project.id, (prev) => ({
                      ...prev,
                      loudnessPreset: val as typeof prev.loudnessPreset,
                    }))
                  }
                  options={[
                    { value: 'acx', label: 'ACX (-20 dBFS RMS / -3 dB Peak)' },
                    { value: 'podcast', label: 'Podcast (-16 LUFS)' },
                    { value: 'off', label: 'Off (Raw Engine Gain)' },
                  ]}
                  ariaLabel="Loudness Preset"
                  searchable={false}
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Book Speed</span>
                  <span className="font-mono text-zinc-200">{project.globalSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={project.globalSpeed}
                  onChange={(e) =>
                    updateLongformProject(project.id, (prev) => ({
                      ...prev,
                      globalSpeed: Number(e.target.value),
                    }))
                  }
                  className="mt-2.5 w-full accent-[#F47FA3]"
                />
              </div>
            </div>
          </section>

          {/* Character Cast Section */}
          <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersRoundIcon className="size-4 text-[#F47FA3]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Character Cast ({project.characters.length})
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              {project.characters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      style={{ backgroundColor: char.color }}
                      className="size-2.5 shrink-0 rounded-full"
                    />
                    <span className="truncate text-xs font-medium text-zinc-100">{char.name}</span>
                  </div>
                  <VoiceSelector
                    profiles={profiles}
                    value={char.voiceId}
                    onChange={(voiceId) =>
                      updateLongformProject(project.id, (prev) => ({
                        ...prev,
                        characters: prev.characters.map((c) =>
                          c.id === char.id ? { ...c, voiceId } : c,
                        ),
                      }))
                    }
                    size="sm"
                    className="w-44"
                  />
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCharacter} className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="New character name…"
                className="h-7 flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
              />
              <button
                type="submit"
                className="rounded bg-zinc-800 px-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Add Cast
              </button>
            </form>
          </section>

          {/* Pronunciation Dictionary */}
          <section className="space-y-2.5 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Pronunciation Lexicon ({project.pronunciations.length})
            </h2>
            {duplicatePronWord && (
              <div className="flex items-center gap-1.5 rounded bg-rose-500/15 px-2.5 py-1.5 text-xs text-rose-300">
                <AlertCircleIcon className="size-3.5 shrink-0" />
                <span>Duplicate pronunciation word “{duplicatePronWord}” blocks rendering.</span>
              </div>
            )}
            <div className="space-y-1.5">
              {project.pronunciations.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded border border-zinc-800/70 bg-zinc-900/40 px-2.5 py-1 text-xs"
                >
                  <span>
                    <strong className="text-zinc-200">{p.word}</strong> →{' '}
                    <span className="text-[#F7AE73]">{p.replacement}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateLongformProject(project.id, (prev) => ({
                        ...prev,
                        pronunciations: prev.pronunciations.filter((item) => item.id !== p.id),
                      }))
                    }
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newPronWord}
                onChange={(e) => setNewPronWord(e.target.value)}
                placeholder="Word"
                className="h-7 w-1/2 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
              />
              <input
                type="text"
                value={newPronReplace}
                onChange={(e) => setNewPronReplace(e.target.value)}
                placeholder="Spoken respelling"
                className="h-7 w-1/2 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newPronWord.trim() || !newPronReplace.trim()) return;
                  updateLongformProject(project.id, (prev) => ({
                    ...prev,
                    pronunciations: [
                      ...prev.pronunciations,
                      {
                        id: `pron_${Date.now()}`,
                        word: newPronWord.trim(),
                        replacement: newPronReplace.trim(),
                      },
                    ],
                  }));
                  setNewPronWord('');
                  setNewPronReplace('');
                }}
                className="rounded bg-zinc-800 px-2 text-xs text-zinc-200 hover:bg-zinc-700"
              >
                +
              </button>
            </div>
          </section>

          {/* Pinned Render & Export Tracker */}
          <section className="space-y-3 rounded-xl border border-[#F47FA3]/40 bg-[#161120] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-100">Longform Render & Chapter Export</span>
              {isRendering && (
                <span className="font-mono text-[#F47FA3]">{renderProgress}% · 3.4x RTF</span>
              )}
            </div>

            {isRendering && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  style={{ width: `${renderProgress}%` }}
                  className="h-full bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] transition-all"
                />
              </div>
            )}

            <button
              type="button"
              disabled={isRendering || Boolean(duplicatePronWord)}
              onClick={handleRenderProject}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] py-2 text-xs font-semibold text-zinc-950 shadow-md disabled:opacity-50"
            >
              <SparklesIcon className="size-4" />
              <span>
                {isRendering
                  ? 'Synthesizing & Mastering Chapters…'
                  : `Render ${project.outputFormat.toUpperCase()} (${project.loudnessPreset.toUpperCase()})`}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {project.lastRenderUrl && (
                <a
                  href={project.lastRenderUrl}
                  download={`${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${project.outputFormat}`}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 py-1.5 text-xs text-zinc-200 hover:border-zinc-600"
                >
                  <DownloadIcon className="size-3.5 text-[#F47FA3]" />
                  <span>Save {project.outputFormat.toUpperCase()}</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleExportCueSheet}
                className="flex items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 py-1.5 text-xs text-zinc-200 hover:border-zinc-600"
              >
                <FileTextIcon className="size-3.5 text-[#F7AE73]" />
                <span>Cue Sheet (.txt)</span>
              </button>
            </div>
          </section>
        </div>

        {/* Right Editor Pane (8 cols) */}
        <div className="space-y-4 lg:col-span-8">
          {mode === 'stories' ? (
            <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Multi-Voice Story Script ({project.lines.length} blocks)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Assign a character per line, insert `# Chapter` headings, or auto-cast dialogue.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportBox((v) => !v)}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F47FA3]/50"
                  >
                    Auto-Cast / Import Text
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateLongformProject(project.id, (prev) => ({
                        ...prev,
                        lines: [
                          ...prev.lines,
                          {
                            id: `ch_${Date.now()}`,
                            type: 'chapter',
                            characterId: prev.characters[0]?.id || 'char_narrator',
                            text: `# Chapter ${
                              prev.lines.filter((l) => l.type === 'chapter').length + 1
                            }: New Scene`,
                          },
                        ],
                      }))
                    }
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600"
                  >
                    + Chapter Heading
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateLongformProject(project.id, (prev) => ({
                        ...prev,
                        lines: [
                          ...prev.lines,
                          {
                            id: `line_${Date.now()}`,
                            type: 'line',
                            characterId: prev.characters[0]?.id || 'char_narrator',
                            text: 'New dialogue line.',
                          },
                        ],
                      }))
                    }
                    className="flex items-center gap-1 rounded-md bg-[#F47FA3] px-3 py-1.5 text-xs font-semibold text-zinc-950"
                  >
                    <PlusIcon className="size-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>
              </div>

              {showImportBox && (
                <div className="mb-4 space-y-2 rounded-lg border border-[#F47FA3]/40 bg-[#181324] p-3">
                  <div className="text-xs font-medium text-zinc-200">
                    Paste screenplay (`Speaker: Dialogue`), Markdown chapters, or prose to Auto-Cast:
                  </div>
                  <textarea
                    rows={4}
                    value={importBuffer}
                    onChange={(e) => setImportBuffer(e.target.value)}
                    placeholder={`# Chapter 2: The Harbor\nNarrator: The mist rose over the water.\nElena: Look at the lighthouse tower!`}
                    className="w-full rounded border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-100"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImportBox(false)}
                      className="text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoCastBuffer}
                      className="rounded bg-[#F47FA3] px-3 py-1 text-xs font-semibold text-zinc-950"
                    >
                      Auto-Cast into Lines
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {project.lines.map((line, idx) => {
                  const char =
                    project.characters.find((c) => c.id === line.characterId) ||
                    project.characters[0];

                  if (line.type === 'chapter') {
                    return (
                      <div
                        key={line.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2"
                      >
                        <input
                          type="text"
                          value={line.text}
                          onChange={(e) =>
                            updateLongformProject(project.id, (prev) => ({
                              ...prev,
                              lines: prev.lines.map((l) =>
                                l.id === line.id ? { ...l, text: e.target.value } : l,
                              ),
                            }))
                          }
                          className="flex-1 bg-transparent font-semibold text-xs text-amber-200 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateLongformProject(project.id, (prev) => ({
                              ...prev,
                              lines: prev.lines.filter((l) => l.id !== line.id),
                            }))
                          }
                          className="text-zinc-400 hover:text-rose-400"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={line.id}
                      className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-700"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: char?.color || '#F47FA3' }}
                            className="size-2.5 rounded-full"
                          />
                          <SearchableSelect
                            value={line.characterId}
                            onChange={(characterId) =>
                              updateLongformProject(project.id, (prev) => ({
                                ...prev,
                                lines: prev.lines.map((l) =>
                                  l.id === line.id ? { ...l, characterId } : l,
                                ),
                              }))
                            }
                            options={project.characters.map((c) => ({
                              value: c.id,
                              label: c.name,
                            }))}
                            ariaLabel="Line Character"
                            searchable={false}
                            size="sm"
                            className="w-40"
                          />
                          {line.speedOverride && (
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                              {line.speedOverride}x speed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAuditionLine(line)}
                            className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-[#F47FA3]"
                          >
                            <PlayIcon className="size-3 fill-current text-[#F47FA3]" />
                            <span>Audition</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveLine(idx, -1)}
                            disabled={idx === 0}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                          >
                            <ArrowUpIcon className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveLine(idx, 1)}
                            disabled={idx === project.lines.length - 1}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                          >
                            <ArrowDownIcon className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateLongformProject(project.id, (prev) => ({
                                ...prev,
                                lines: prev.lines.filter((l) => l.id !== line.id),
                              }))
                            }
                            className="rounded p-1 text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={line.text}
                        onChange={(e) =>
                          updateLongformProject(project.id, (prev) => ({
                            ...prev,
                            lines: prev.lines.map((l) =>
                              l.id === line.id ? { ...l, text: e.target.value } : l,
                            ),
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 p-2.5 text-sm text-zinc-100 focus:border-[#F47FA3] focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            /* Audiobook Manuscript Mode */
            <section className="space-y-4 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Audiobook Manuscript Editor ({chaptersParsed.length} Chapters Detected)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Use `# Chapter Title` for M4B chapter markers and `[voice: Name]` for inline
                    character switching.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>Author:</span>
                  <input
                    type="text"
                    value={project.author}
                    onChange={(e) =>
                      updateLongformProject(project.id, (prev) => ({
                        ...prev,
                        author: e.target.value,
                      }))
                    }
                    className="h-7 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
                  />
                </div>
              </div>

              <textarea
                rows={14}
                value={project.manuscript}
                onChange={(e) =>
                  updateLongformProject(project.id, (prev) => ({
                    ...prev,
                    manuscript: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 p-4 font-serif text-sm leading-relaxed text-zinc-100 focus:border-[#F47FA3] focus:outline-none"
              />

              {/* Chapter Plan & Audition List */}
              <div className="space-y-2 border-t border-zinc-800/80 pt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Parsed Chapter Plan & Auditions
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {chaptersParsed.map((chTitle, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs"
                    >
                      <span className="truncate font-medium text-zinc-200">{chTitle}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const synth = synthesizeSpeechWav({
                            text: chTitle,
                            speed: project.globalSpeed,
                          });
                          playAudio({
                            title: `Chapter Audition: ${chTitle}`,
                            subtitle: `${project.title} · ${project.loudnessPreset.toUpperCase()}`,
                            audioUrl:
                              idx === 0 && project.lastRenderUrl
                                ? project.lastRenderUrl
                                : synth.audioUrl,
                            durationSec: 7.8,
                            peaks: synth.peaks,
                          });
                        }}
                        className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:border-[#F47FA3]"
                      >
                        <PlayIcon className="size-3 fill-current text-[#F47FA3]" />
                        <span>Audition</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
