import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRightIcon,
  DownloadIcon,
  LibraryIcon,
  PlayIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
  UsersRoundIcon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import { SearchableSelect } from '@/components/SearchableSelect';
import { ARCHETYPE_CATALOG, USE_CASE_CATEGORIES, VOICE_DESIGN_OPTIONS } from '@/data/taxonomy';
import { synthesizeSpeechWav } from '@/utils/audioSynth';
import type { ArchetypeItem } from '@/types/voicestudio';

export function GalleryWorkspace() {
  const {
    playAudio,
    setDesignStates,
    setDesignLanguage,
    setRoute,
    addProfile,
    notify,
  } = useStudio();

  const [tier, setTier] = useState<'featured' | 'all' | 'favorites'>('featured');
  const [useCase, setUseCase] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [pitchFilter, setPitchFilter] = useState<string>('all');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(['feat_00_the_librarian', 'feat_08_captain_crusty', 'feat_13_the_podcaster']),
  );
  const [visibleLimit, setVisibleLimit] = useState<number>(24);

  const filteredArchetypes = useMemo(() => {
    return ARCHETYPE_CATALOG.filter((item) => {
      if (tier === 'featured' && !item.is_featured) return false;
      if (tier === 'favorites' && !favorites.has(item.id)) return false;
      if (useCase !== 'all' && item.use_case !== useCase) return false;
      if (genderFilter !== 'all' && item.facets.gender !== genderFilter) return false;
      if (ageFilter !== 'all' && item.facets.age !== ageFilter) return false;
      if (pitchFilter !== 'all' && item.facets.pitch !== pitchFilter) return false;
      if (langFilter !== 'all' && item.language !== langFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.instruct.toLowerCase().includes(q) ||
          item.language.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tier, useCase, genderFilter, ageFilter, pitchFilter, langFilter, search, favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePreviewArchetype = (item: ArchetypeItem) => {
    if (item.preview_url) {
      playAudio({
        title: `${item.name} (${item.language})`,
        subtitle: item.instruct,
        audioUrl: item.preview_url,
        durationSec: 6.2,
        peaks: [0.35, 0.75, 0.55, 0.9, 0.65, 0.85, 0.4, 0.7, 0.5, 0.3],
      });
    } else {
      const synth = synthesizeSpeechWav({
        text: item.sample_script,
        instruct: item.instruct,
        seed: 42,
      });
      playAudio({
        title: `${item.name} (${item.language})`,
        subtitle: item.instruct,
        audioUrl: synth.audioUrl,
        durationSec: synth.durationSec,
        peaks: synth.peaks,
      });
    }
  };

  const handleUseVoice = (item: ArchetypeItem) => {
    addProfile({
      name: item.name,
      kind: 'design',
      language: item.language,
      ref_text: item.sample_script,
      instruct: item.instruct,
      seed: 42,
      vd_states: { ...item.attrs },
      audio_url:
        item.preview_url ||
        '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
      starred: true,
    });
    setDesignStates({ ...item.attrs });
    setDesignLanguage(item.language);
    setRoute('/design');
    notify(`Loaded "${item.name}" into Voice Design (existing script preserved)`);
  };

  const availableLanguages = useMemo(
    () => ['all', ...Array.from(new Set(ARCHETYPE_CATALOG.map((a) => a.language)))],
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      {/* Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#F47FA3]/15 text-[#F47FA3]">
            <LibraryIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              VoiceStudio Archetype Gallery ({ARCHETYPE_CATALOG.length} Voices)
            </h2>
            <p className="text-xs text-zinc-400">
              Designed voices built from the validated voice-design taxonomy — zero real-person
              clones, ready for immediate synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1">
          {(
            [
              ['featured', 'Featured (51)'],
              ['all', `Browse All (${ARCHETYPE_CATALOG.length})`],
              ['favorites', `Favorites (${favorites.size})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTier(id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tier === id
                  ? 'bg-[#241d31] text-white shadow-xs ring-1 ring-[#F47FA3]/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 7 Use-Case Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setUseCase('all')}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            useCase === 'all'
              ? 'border-[#F47FA3]/50 bg-[#F47FA3]/15 text-[#FFD0DB]'
              : 'border-zinc-800 bg-[#110f17] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          }`}
        >
          All Categories
        </button>
        {USE_CASE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setUseCase(cat.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              useCase === cat.id
                ? 'border-[#F47FA3]/50 bg-[#F47FA3]/15 text-[#FFD0DB]'
                : 'border-zinc-800 bg-[#110f17] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Facet Filter Bar */}
      <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-zinc-800/80 bg-[#110f17] p-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, accent, instruct…"
            className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900/90 pl-8 pr-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#F47FA3] focus:outline-none"
          />
        </div>
        <SearchableSelect
          value={genderFilter}
          onChange={setGenderFilter}
          options={[
            { value: 'all', label: 'All Genders' },
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
          ariaLabel="Filter by Gender"
          searchable={false}
        />
        <SearchableSelect
          value={ageFilter}
          onChange={setAgeFilter}
          options={[
            { value: 'all', label: 'All Ages' },
            ...VOICE_DESIGN_OPTIONS.Age.filter((a) => a !== 'Auto').map((a) => ({
              value: a,
              label: a,
            })),
          ]}
          ariaLabel="Filter by Age"
          searchable={false}
        />
        <SearchableSelect
          value={pitchFilter}
          onChange={setPitchFilter}
          options={[
            { value: 'all', label: 'All Pitches' },
            ...VOICE_DESIGN_OPTIONS.Pitch.filter((p) => p !== 'Auto').map((p) => ({
              value: p,
              label: p,
            })),
          ]}
          ariaLabel="Filter by Pitch"
          searchable={false}
        />
        <SearchableSelect
          value={langFilter}
          onChange={setLangFilter}
          options={availableLanguages.map((l) => ({
            value: l,
            label: l === 'all' ? 'All Languages' : l,
          }))}
          ariaLabel="Filter by Language"
        />
      </div>

      {/* Archetype Cards Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredArchetypes.slice(0, visibleLimit).map((item) => {
          const isFav = favorites.has(item.id);
          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-[#110f17] p-4 transition-all hover:border-zinc-700"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-zinc-100">{item.name}</span>
                      {item.is_featured && (
                        <span className="rounded bg-[#F47FA3]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#FFD0DB]">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span>{item.language}</span>
                      <span>·</span>
                      <span className="capitalize">{item.use_case}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Star archetype"
                    onClick={() => toggleFavorite(item.id)}
                    className={`rounded p-1 ${
                      isFav ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <StarIcon className={`size-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <p className="mt-2.5 line-clamp-2 text-xs italic text-zinc-400">
                  “{item.sample_script}”
                </p>

                <div className="mt-2.5 font-mono text-[10px] text-[#F7AE73]">{item.instruct}</div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-3">
                <button
                  type="button"
                  onClick={() => handlePreviewArchetype(item)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F47FA3]/50 hover:text-white"
                >
                  <PlayIcon className="size-3.5 fill-current text-[#F47FA3]" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUseVoice(item)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#F47FA3]/15 px-3 py-1.5 text-xs font-semibold text-[#FFD0DB] ring-1 ring-[#F47FA3]/40 hover:bg-[#F47FA3]/25"
                >
                  <span>Use Voice</span>
                  <ArrowRightIcon className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredArchetypes.length > visibleLimit && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleLimit((v) => v + 24)}
            className="rounded-lg border border-zinc-800 bg-[#110f17] px-5 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:text-white"
          >
            Load More Voices ({filteredArchetypes.length - visibleLimit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

export function PersonasWorkspace() {
  const {
    profiles,
    selectedVoiceId,
    setSelectedVoiceId,
    addProfile,
    updateProfile,
    deleteProfile,
    toggleStarProfile,
    playAudio,
    setRoute,
    notify,
  } = useStudio();

  const importInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editInstruct, setEditInstruct] = useState<string>('');

  const handleExportPersonaBundle = (p: (typeof profiles)[0]) => {
    const bundle = {
      format: 'ovsvoice/1.0',
      exported_at: new Date().toISOString(),
      profile: p,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.ovsvoice.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported portable .ovsvoice bundle for "${p.name}"`);
  };

  const handleImportBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const prof = parsed.profile || parsed;
        if (prof && prof.name) {
          addProfile({
            name: `${prof.name} (Imported)`,
            kind: prof.kind === 'design' ? 'design' : 'clone',
            language: prof.language || 'English',
            ref_text: prof.ref_text || '',
            instruct: prof.instruct || '',
            seed: prof.seed || 42,
            vd_states: prof.vd_states,
            audio_url: prof.audio_url || '/samples/demo_voice.wav',
            starred: true,
          });
        }
      } catch {
        notify('Invalid .ovsvoice persona bundle file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-[#110f17] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
            <UsersRoundIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Saved Voice Profiles & Portable .ovsvoice Bundles ({profiles.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Manage your cloned and designed voices, edit conditioning tags, or export portable
              `.ovsvoice` bundles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.ovsvoice"
            onChange={handleImportBundle}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-600"
          >
            <UploadIcon className="size-3.5 text-[#F7AE73]" />
            <span>Import .ovsvoice</span>
          </button>
          <button
            type="button"
            onClick={() => setRoute('/design')}
            className="flex items-center gap-1.5 rounded-lg bg-[#F47FA3] px-3 py-1.5 text-xs font-semibold text-zinc-950"
          >
            <SparklesIcon className="size-3.5" />
            <span>Design New Voice</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {profiles.map((p) => {
          const isEditing = editingId === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 transition-colors ${
                selectedVoiceId === p.id
                  ? 'border-[#F47FA3]/50 bg-[#181324]'
                  : 'border-zinc-800/80 bg-[#110f17]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      playAudio({
                        title: p.name,
                        subtitle: `${p.kind} · ${p.language}`,
                        audioUrl: p.audio_url,
                        durationSec: 5.8,
                        peaks: [0.4, 0.7, 0.55, 0.85, 0.6, 0.9, 0.5, 0.75],
                      })
                    }
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#261e36] text-[#F47FA3] hover:bg-[#F47FA3] hover:text-zinc-950"
                  >
                    <PlayIcon className="size-4 fill-current" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100">{p.name}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          p.kind === 'clone'
                            ? 'bg-violet-500/15 text-violet-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {p.kind}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-400">
                      {p.instruct || 'Neutral reference'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleStarProfile(p.id)}
                    className={`rounded p-1.5 ${
                      p.starred ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <StarIcon className={`size-4 ${p.starred ? 'fill-current' : ''}`} />
                  </button>
                  {!p.locked && (
                    <button
                      type="button"
                      onClick={() => deleteProfile(p.id)}
                      className="rounded p-1.5 text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-xs text-zinc-400">“{p.ref_text}”</p>

              {isEditing ? (
                <div className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 w-full rounded border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-100"
                  />
                  <input
                    type="text"
                    value={editInstruct}
                    onChange={(e) => setEditInstruct(e.target.value)}
                    className="h-7 w-full rounded border border-zinc-800 bg-zinc-900 px-2 font-mono text-xs text-zinc-200"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateProfile(p.id, {
                          name: editName.trim() || p.name,
                          instruct: editInstruct.trim(),
                        });
                        setEditingId(null);
                        notify('Updated voice profile');
                      }}
                      className="rounded bg-[#F47FA3] px-2.5 py-1 text-xs font-semibold text-zinc-950"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 pt-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVoiceId(p.id);
                        setRoute('/clone');
                      }}
                      className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                    >
                      Open in Clone
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(p.id);
                        setEditName(p.name);
                        setEditInstruct(p.instruct);
                      }}
                      className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Edit
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportPersonaBundle(p)}
                    className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
                  >
                    <DownloadIcon className="size-3.5" />
                    <span>Export .ovsvoice</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
