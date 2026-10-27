import React, { useState } from 'react';
import {
  BookmarkPlusIcon,
  CheckIcon,
  PlayIcon,
  RefreshCwIcon,
  SparklesIcon,
  WandSparklesIcon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import { SearchableSelect } from '@/components/SearchableSelect';
import {
  CATEGORY_ORDER,
  DEFAULT_VD_STATES,
  PERSONALITY_PRESETS,
  SUPPORTED_LANGUAGES,
  VOICE_DESIGN_OPTIONS,
  buildInstructFromAttributes,
  describeVoiceToAttributes,
} from '@/data/taxonomy';
import type { VoiceDesignAttributes } from '@/types/voicestudio';

export function DesignWorkspace() {
  const {
    designScript,
    setDesignScript,
    designStates,
    setDesignStates,
    designSeed,
    setDesignSeed,
    designLanguage,
    setDesignLanguage,
    addProfile,
    createSynthesisTake,
    playAudio,
    notify,
  } = useStudio();

  const [naturalPrompt, setNaturalPrompt] = useState<string>(
    'A warm middle-aged British woman with a low pitch voice',
  );
  const [matchedInfo, setMatchedInfo] = useState<{
    matched: Record<string, string>;
    unmatched: string[];
  } | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  const activeInstruct = buildInstructFromAttributes(designStates);
  const demoPresets = PERSONALITY_PRESETS.filter((p) => p.is_demo);

  const handleMapDescription = () => {
    const res = describeVoiceToAttributes(naturalPrompt);
    setDesignStates(res.attrs);
    setMatchedInfo({ matched: res.matched, unmatched: res.unmatched });
    notify(`Extracted taxonomy recipe: ${res.instruct || 'Neutral Auto'}`);
  };

  const handleAttributeChange = (key: keyof VoiceDesignAttributes, val: string) => {
    setMatchedInfo(null); // Manual choice clears pending natural-language notice
    setDesignStates((prev) => {
      const next = { ...prev, [key]: val };
      if (key === 'EnglishAccent' && val !== 'Auto') {
        next.ChineseDialect = 'Auto';
      } else if (key === 'ChineseDialect' && val !== 'Auto') {
        next.EnglishAccent = 'Auto';
      }
      return next;
    });
  };

  const handleSaveAsProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const name = profileName.trim();
    if (!name) return;
    addProfile({
      name,
      kind: 'design',
      language: designLanguage,
      ref_text: designScript.trim(),
      instruct: activeInstruct,
      seed: designSeed,
      vd_states: { ...designStates },
      audio_url: '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
      starred: true,
    });
    setProfileName('');
    setShowSaveModal(false);
  };

  const handleSynthesize = () => {
    if (!designScript.trim()) return;
    setIsSynthesizing(true);
    setTimeout(() => {
      const matchedDemo = demoPresets.find(
        (d) => d.instruct === activeInstruct && d.script === designScript.trim(),
      );
      createSynthesisTake({
        title: `Designed Voice (${activeInstruct || 'Auto'})`,
        text: designScript.trim(),
        voiceId: `design_seed_${designSeed}`,
        voiceName: `Design #${designSeed}`,
        kind: 'design',
        language: designLanguage,
        instruct: activeInstruct,
        seed: designSeed,
        presetAudioUrl: matchedDemo?.preview_url,
      });
      setIsSynthesizing(false);
    }, 380);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Top Row: Natural Language Mapper + Taxonomy Trait Sliders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          {/* Natural Language Voice Description Mapper */}
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WandSparklesIcon className="size-4 text-[#F47FA3]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Describe Your Voice (Local Deterministic Mapper)
                </h2>
              </div>
              <span className="text-[10px] text-zinc-500">Zero network · stdlib rules</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={naturalPrompt}
                onChange={(e) => setNaturalPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMapDescription()}
                placeholder="e.g. a warm elderly British storyteller, whispery low pitch…"
                className="h-9 flex-1 rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#F47FA3] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleMapDescription}
                className="shrink-0 rounded-lg border border-[#F47FA3]/50 bg-[#F47FA3]/15 px-3.5 text-xs font-semibold text-[#FFD0DB] hover:bg-[#F47FA3]/25"
              >
                Extract Traits
              </button>
            </div>

            {matchedInfo && (
              <div className="mt-2.5 space-y-1.5 rounded-lg border border-zinc-800/70 bg-zinc-900/50 p-2.5 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-zinc-400">Mapped categories:</span>
                  {Object.entries(matchedInfo.matched).length > 0 ? (
                    Object.entries(matchedInfo.matched).map(([cat, phrase]) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300"
                      >
                        <CheckIcon className="size-3" />
                        <span>
                          {cat}: “{phrase}” → {designStates[cat as keyof VoiceDesignAttributes]}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500">No taxonomy phrases matched (all Auto)</span>
                  )}
                </div>
                {matchedInfo.unmatched.length > 0 && (
                  <div className="text-zinc-400">
                    Ignored non-taxonomy terms:{' '}
                    <span className="text-amber-300/90">{matchedInfo.unmatched.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 6 Taxonomy Category Controls */}
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Voice Design Taxonomy Parameters
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDesignStates({ ...DEFAULT_VD_STATES });
                  setMatchedInfo(null);
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                Reset to Auto
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CATEGORY_ORDER.map((category) => (
                <div key={category}>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <SearchableSelect
                    value={designStates[category]}
                    onChange={(val) => handleAttributeChange(category, val)}
                    options={VOICE_DESIGN_OPTIONS[category].map((opt) => ({
                      value: opt,
                      label: opt,
                    }))}
                    ariaLabel={category}
                    searchable={VOICE_DESIGN_OPTIONS[category].length > 6}
                  />
                </div>
              ))}
            </div>

            {/* Identity Seed & Recipe Summary */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Compiled Model Instruct
                </div>
                <div className="truncate font-mono text-xs text-[#FFD0DB]">
                  {activeInstruct || '(Auto neutral conditioning)'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500">Voice Identity Seed</div>
                  <div className="font-mono text-xs font-semibold text-zinc-200">#{designSeed}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDesignSeed(Math.floor(Math.random() * 9000) + 100)}
                  className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-zinc-600 hover:text-white"
                  title="Generate a new voice identity while keeping traits"
                >
                  <RefreshCwIcon className="size-3.5 text-[#F7AE73]" />
                  <span>New seed</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Script Editor, Save as Voice Profile & Synthesis */}
        <div className="space-y-4 lg:col-span-6">
          <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Design Audition & Synthesis Script
              </h2>
              <div className="flex items-center gap-2">
                <SearchableSelect
                  value={designLanguage}
                  onChange={setDesignLanguage}
                  options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: l }))}
                  ariaLabel="Design Language"
                  size="sm"
                  className="w-36"
                />
                <button
                  type="button"
                  onClick={() => setShowSaveModal((v) => !v)}
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-[#F47FA3]/50 hover:text-white"
                >
                  <BookmarkPlusIcon className="size-3.5 text-[#F47FA3]" />
                  <span>Save as Voice Profile</span>
                </button>
              </div>
            </div>

            {showSaveModal && (
              <form
                onSubmit={handleSaveAsProfile}
                className="mb-3 flex items-center gap-2 rounded-lg border border-[#F47FA3]/40 bg-[#191424] p-2.5"
              >
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter name for designed voice profile…"
                  className="h-8 flex-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-100 focus:border-[#F47FA3] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md bg-[#F47FA3] px-3 py-1.5 text-xs font-semibold text-zinc-950"
                >
                  Save Profile
                </button>
              </form>
            )}

            <textarea
              rows={7}
              value={designScript}
              onChange={(e) => setDesignScript(e.target.value)}
              placeholder="Write a script to audition or synthesize with your designed voice…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 p-3.5 text-sm leading-relaxed text-zinc-100 focus:border-[#F47FA3] focus:outline-none"
            />

            <div className="mt-3 flex items-center justify-between pt-2">
              <div className="text-xs text-zinc-400">
                Seed <span className="font-mono text-zinc-200">#{designSeed}</span> stays locked
                while adjusting traits
              </div>
              <button
                type="button"
                disabled={isSynthesizing || !designScript.trim()}
                onClick={handleSynthesize}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#F47FA3] to-[#F7AE73] px-5 py-2 text-xs font-semibold text-zinc-950 shadow-md transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                <SparklesIcon className="size-4" />
                <span>{isSynthesizing ? 'Synthesizing…' : 'Synthesize Designed Voice'}</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Curated Demo Starting Points (7-Card Grid from personalities.py) */}
      <section className="rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Bundled Voice Design Showcases (7 Pre-Rendered Starting Points)
            </h2>
            <p className="text-xs text-zinc-400">
              Click any card to load its taxonomy attributes and script, or click Play to hear its
              bundled WAV sample.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {demoPresets.map((demo) => {
            const isSelected = activeInstruct === demo.instruct;
            return (
              <div
                key={demo.id}
                onClick={() => {
                  if (demo.attrs) setDesignStates(demo.attrs);
                  if (demo.script) setDesignScript(demo.script);
                  if (demo.language) setDesignLanguage(demo.language);
                }}
                className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all ${
                  isSelected
                    ? 'border-[#F47FA3]/60 bg-[#1e172a] shadow-md'
                    : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-zinc-100">{demo.name}</div>
                      <span className="inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        {demo.language}
                      </span>
                    </div>
                    {demo.preview_url && (
                      <button
                        type="button"
                        title={`Play ${demo.name} sample`}
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio({
                            title: `${demo.name} (Voice Design Demo)`,
                            subtitle: demo.instruct,
                            audioUrl: demo.preview_url!,
                            durationSec: 6.5,
                            peaks: [0.35, 0.7, 0.55, 0.9, 0.6, 0.8, 0.45, 0.75, 0.5, 0.3],
                          });
                        }}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#261e35] text-[#F47FA3] hover:bg-[#F47FA3] hover:text-zinc-950"
                      >
                        <PlayIcon className="size-3.5 fill-current" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">{demo.description}</p>
                </div>

                <div className="mt-3 border-t border-zinc-800/70 pt-2 font-mono text-[10px] text-[#F7AE73]">
                  {demo.instruct}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
