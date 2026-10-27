import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLinesIcon,
  BlocksIcon,
  BookOpenIcon,
  ChevronRightIcon,
  CpuIcon,
  DownloadIcon,
  FilmIcon,
  FingerprintIcon,
  FolderIcon,
  HeartIcon,
  LanguagesIcon,
  LayersIcon,
  LibraryIcon,
  MemoryStickIcon,
  MicIcon,
  PanelLeftIcon,
  PanelLeftOpenIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  UsersRoundIcon,
  Volume2Icon,
  WandSparklesIcon,
  WorkflowIcon,
  WrenchIcon,
  XIcon,
} from 'lucide-react';
import { useStudio } from '@/context/StudioContext';
import type { WorkspaceRoute } from '@/types/voicestudio';
import {
  formatDuration,
  speakWithBrowserTts,
  stopBrowserSpeech,
  synthesizeSpeechWav,
} from '@/utils/audioSynth';

interface NavDestination {
  to: WorkspaceRoute;
  label: string;
  tone: string;
  motion: string;
  Icon: typeof AudioLinesIcon;
  keywords?: string;
}

const VOICE_DESTINATIONS: NavDestination[] = [
  {
    to: '/clone',
    label: 'Voice Cloning',
    tone: 'clone',
    motion: 'pulse',
    Icon: FingerprintIcon,
    keywords: 'zero-shot reference wav record synthesize',
  },
  {
    to: '/design',
    label: 'Voice Design',
    tone: 'design',
    motion: 'tilt',
    Icon: WandSparklesIcon,
    keywords: 'describe traits pitch accent gender seed',
  },
  {
    to: '/personas',
    label: 'Saved Voices',
    tone: 'personas',
    motion: 'nudge',
    Icon: UsersRoundIcon,
    keywords: 'profiles library ovsvoice bundle',
  },
  {
    to: '/gallery',
    label: 'Voice Gallery',
    tone: 'gallery',
    motion: 'lift',
    Icon: LibraryIcon,
    keywords: 'archetypes featured catalogue community',
  },
];

const STORY_DESTINATIONS: NavDestination[] = [
  {
    to: '/stories',
    label: 'Stories Studio',
    tone: 'stories',
    motion: 'wave',
    Icon: AudioLinesIcon,
    keywords: 'multi-character dialogue cast lines stems',
  },
  {
    to: '/audiobook',
    label: 'Audiobook',
    tone: 'audiobook',
    motion: 'tilt',
    Icon: BookOpenIcon,
    keywords: 'manuscript chapters m4b acx mastering cue sheet',
  },
];

const DUB_DESTINATIONS: NavDestination[] = [
  {
    to: '/dub',
    label: 'Video Dubbing',
    tone: 'dub',
    motion: 'tilt',
    Icon: FilmIcon,
    keywords: 'translate video srt smart fit prosody mirror',
  },
  {
    to: '/batch',
    label: 'Batch Dubbing',
    tone: 'batch',
    motion: 'lift',
    Icon: LayersIcon,
    keywords: 'queue multi-language watch folders',
  },
];

const LATER_DESTINATIONS: NavDestination[] = [
  {
    to: '/transcriptions',
    label: 'Transcriptions',
    tone: 'transcriptions',
    motion: 'nudge',
    Icon: MicIcon,
    keywords: 'dictation whisper parakeet asr live',
  },
  {
    to: '/calls',
    label: 'Voice Workflows & Calls',
    tone: 'calls',
    motion: 'pulse',
    Icon: WorkflowIcon,
    keywords: 'conversational agent telephony twilio',
  },
  {
    to: '/projects',
    label: 'Projects & History',
    tone: 'projects',
    motion: 'lift',
    Icon: FolderIcon,
    keywords: 'saved projects renders recipe history',
  },
  {
    to: '/tools',
    label: 'Audio Tools',
    tone: 'tools',
    motion: 'tilt',
    Icon: WrenchIcon,
    keywords: 'voice convert directorial ai speech-rate fit ffprobe',
  },
  {
    to: '/integrations',
    label: 'Local API & MCP',
    tone: 'integrations',
    motion: 'turn',
    Icon: BlocksIcon,
    keywords: 'mcp server claude cursor openai compatible',
  },
];

const ALL_DESTINATIONS: NavDestination[] = [
  ...VOICE_DESTINATIONS,
  ...STORY_DESTINATIONS,
  ...DUB_DESTINATIONS,
  ...LATER_DESTINATIONS,
  {
    to: '/settings',
    label: 'Settings & Models',
    tone: 'settings',
    motion: 'turn',
    Icon: SettingsIcon,
    keywords: 'models huggingface gpu vram dictation storage',
  },
];

const CONTEXT_SIDEBAR_ROUTES = new Set<WorkspaceRoute>(['/clone', '/design', '/personas']);

function NavGroup({
  title,
  groupTone,
  Icon,
  items,
  compact,
  currentRoute,
  onNavigate,
}: {
  title: string;
  groupTone: string;
  Icon: typeof AudioLinesIcon;
  items: NavDestination[];
  compact: boolean;
  currentRoute: WorkspaceRoute;
  onNavigate: (to: WorkspaceRoute) => void;
}) {
  const isActive = items.some((i) => i.to === currentRoute);
  const [expanded, setExpanded] = useState(true);

  if (compact) {
    return (
      <div className="space-y-0.5 py-0.5">
        {items.map((item) => {
          const active = item.to === currentRoute;
          return (
            <button
              key={item.to}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.to)}
              className={`workspace-nav-item flex h-9 w-full items-center justify-center rounded-md transition-colors ${
                active
                  ? 'bg-[#211B2B] text-white ring-1 ring-inset ring-white/10'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              <item.Icon
                className="workspace-nav-icon size-4 shrink-0"
                data-tone={item.tone}
                data-motion={item.motion}
              />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        data-active={isActive}
        onClick={() => setExpanded((v) => !v)}
        className={`workspace-nav-item group flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors ${
          isActive
            ? 'bg-[#1c1726]/80 text-zinc-100 ring-1 ring-inset ring-white/5'
            : 'text-zinc-300 hover:bg-zinc-900/80 hover:text-white'
        }`}
      >
        <Icon
          className="workspace-nav-icon size-4 shrink-0 text-zinc-400"
          data-tone={groupTone}
          data-motion={groupTone === 'stories-group' ? 'wave' : 'pulse'}
        />
        <span className="truncate">{title}</span>
        <ChevronRightIcon
          className={`ml-auto size-3.5 shrink-0 text-zinc-500 transition-transform duration-150 ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>
      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-zinc-800/80 pl-2">
          {items.map((item) => {
            const active = item.to === currentRoute;
            return (
              <button
                key={item.to}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.to)}
                className={`workspace-nav-item flex h-7.5 w-full items-center gap-2 rounded-md px-2 text-[12.5px] transition-colors ${
                  active
                    ? 'bg-[#241d30] font-medium text-white shadow-sm ring-1 ring-inset ring-white/10'
                    : 'text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-100'
                }`}
              >
                <item.Icon
                  className="workspace-nav-icon size-3.5 shrink-0 text-zinc-400"
                  data-tone={item.tone}
                  data-motion={item.motion}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBar({ compact }: { compact: boolean }) {
  const {
    activeTtsEngine,
    activeAsrEngine,
    activeTranslationEngine,
    performanceTier,
    setPerformanceTier,
    setRoute,
  } = useStudio();
  const [hwOpen, setHwOpen] = useState(false);

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1.5 border-t border-zinc-800/80 py-2">
        <button
          type="button"
          onClick={() => setRoute('/settings')}
          title={`Engines Ready · TTS: ${activeTtsEngine}`}
          className="flex size-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(52_211_153/60%)]" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-t border-zinc-800/70 bg-[#0b0910] px-2.5 py-2 text-xs">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_7px_rgb(52_211_153/55%)]" />
          <span>Local Runtime Ready</span>
        </div>
        <button
          type="button"
          onClick={() => setHwOpen((o) => !o)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
          title="Inspect hardware & performance profile"
        >
          <CpuIcon className="size-3 text-[#F47FA3]" />
          <span>VRAM 3.2G</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => setRoute('/settings')}
          className="flex items-center gap-1.5 rounded border border-zinc-800/80 bg-zinc-900/60 px-1.5 py-1 text-left hover:border-zinc-700"
          title="Active TTS Engine"
        >
          <AudioLinesIcon className="size-3 shrink-0 text-[#F47FA3]" />
          <span className="truncate text-[10px] text-zinc-300">{activeTtsEngine}</span>
        </button>
        <button
          type="button"
          onClick={() => setRoute('/settings')}
          className="flex items-center gap-1.5 rounded border border-zinc-800/80 bg-zinc-900/60 px-1.5 py-1 text-left hover:border-zinc-700"
          title="Active ASR Engine"
        >
          <MicIcon className="size-3 shrink-0 text-teal-400" />
          <span className="truncate text-[10px] text-zinc-300">{activeAsrEngine}</span>
        </button>
        <button
          type="button"
          onClick={() => setRoute('/settings')}
          className="flex items-center gap-1.5 rounded border border-zinc-800/80 bg-zinc-900/60 px-1.5 py-1 text-left hover:border-zinc-700"
          title="Active Translation Engine"
        >
          <LanguagesIcon className="size-3 shrink-0 text-amber-400" />
          <span className="truncate text-[10px] text-zinc-300">{activeTranslationEngine}</span>
        </button>
      </div>

      {hwOpen && (
        <div className="absolute bottom-full left-2 right-2 z-50 mb-1.5 rounded-lg border border-zinc-800 bg-[#14111d] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-100">Hardware & Compute</span>
            <button
              type="button"
              onClick={() => setHwOpen(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          <div className="space-y-2 text-[11px]">
            <div>
              <div className="flex justify-between text-zinc-400">
                <span className="flex items-center gap-1">
                  <CpuIcon className="size-3" /> GPU (Accelerated)
                </span>
                <span className="tabular-nums text-zinc-200">24% · 3.2 / 16.0 GiB</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-1/4 rounded-full bg-[#F47FA3]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-zinc-400">
                <span className="flex items-center gap-1">
                  <MemoryStickIcon className="size-3" /> System RAM
                </span>
                <span className="tabular-nums text-zinc-200">6.8 / 32.0 GiB</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-1/5 rounded-full bg-[#F7AE73]" />
              </div>
            </div>
            <div className="pt-1">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Performance Profile
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ['low_vram', 'Low VRAM'],
                    ['balanced', 'Balanced'],
                    ['high_quality', 'Max Quality'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPerformanceTier(id)}
                    className={`rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                      performanceTier === id
                        ? 'bg-[#F47FA3]/20 text-[#FFD0DB] ring-1 ring-[#F47FA3]/50'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VoicesContextSidebar() {
  const {
    profiles,
    selectedVoiceId,
    setSelectedVoiceId,
    toggleStarProfile,
    takes,
    playAudio,
    setRoute,
    setDesignStates,
    setDesignSeed,
    setDesignScript,
  } = useStudio();
  const [tab, setTab] = useState<'voices' | 'takes'>('voices');
  const [filter, setFilter] = useState<'all' | 'clone' | 'design' | 'starred'>('all');
  const [search, setSearch] = useState('');

  const filteredProfiles = profiles.filter((p) => {
    if (filter === 'clone' && p.kind !== 'clone') return false;
    if (filter === 'design' && p.kind !== 'design') return false;
    if (filter === 'starred' && !p.starred) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.instruct.toLowerCase().includes(q) ||
        p.language.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <aside
      aria-label="Saved Voices & Takes"
      className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800/70 bg-[#0e0c14]"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/70 px-3">
        <div className="flex items-center gap-1 rounded-md bg-zinc-900/90 p-0.5">
          <button
            type="button"
            onClick={() => setTab('voices')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === 'voices'
                ? 'bg-[#211B2B] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Voices ({profiles.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('takes')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === 'takes'
                ? 'bg-[#211B2B] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Takes ({takes.length})
          </button>
        </div>
      </div>

      {tab === 'voices' ? (
        <>
          <div className="space-y-2 border-b border-zinc-800/60 p-2.5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search voices…"
                className="h-7 w-full rounded-md border border-zinc-800 bg-zinc-900/80 pl-8 pr-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#F47FA3]/60 focus:outline-none"
              />
            </div>
            <div className="flex gap-1">
              {(
                [
                  ['all', 'All'],
                  ['clone', 'Clone'],
                  ['design', 'Design'],
                  ['starred', 'Starred'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`flex-1 rounded py-1 text-[11px] font-medium transition-colors ${
                    filter === id
                      ? 'bg-[#F47FA3]/15 text-[#FFD0DB] ring-1 ring-[#F47FA3]/40'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {filteredProfiles.map((profile) => {
              const selected = profile.id === selectedVoiceId;
              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    setSelectedVoiceId(profile.id);
                    if (profile.kind === 'design' && profile.vd_states) {
                      setDesignStates(profile.vd_states);
                      if (profile.seed) setDesignSeed(profile.seed);
                      if (profile.ref_text) setDesignScript(profile.ref_text);
                    }
                  }}
                  className={`group flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all ${
                    selected
                      ? 'border-[#F47FA3]/50 bg-[#1e1729] shadow-sm'
                      : 'border-transparent bg-zinc-900/40 hover:border-zinc-800 hover:bg-zinc-900/80'
                  }`}
                >
                  <button
                    type="button"
                    title={`Play sample for ${profile.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio({
                        title: profile.name,
                        subtitle: `${profile.kind === 'clone' ? 'Cloned Voice' : 'Designed Voice'} · ${profile.language}`,
                        audioUrl: profile.audio_url,
                        durationSec: 5.4,
                        peaks: [0.3, 0.6, 0.8, 0.5, 0.9, 0.7, 0.4, 0.75, 0.6, 0.35],
                      });
                    }}
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#251d33] text-[#F47FA3] transition-transform hover:scale-105 hover:bg-[#F47FA3] hover:text-zinc-950"
                  >
                    <PlayIcon className="size-3.5 fill-current" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-zinc-100">
                        {profile.name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-400">
                      <span
                        className={`rounded px-1 py-0.2 font-medium ${
                          profile.kind === 'clone'
                            ? 'bg-violet-500/15 text-violet-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {profile.kind === 'clone' ? 'Clone' : 'Design'}
                      </span>
                      <span className="truncate">{profile.instruct || profile.language}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Star profile"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStarProfile(profile.id);
                    }}
                    className={`mt-0.5 rounded p-1 transition-colors ${
                      profile.starred
                        ? 'text-amber-400'
                        : 'text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300'
                    }`}
                  >
                    <StarIcon className={`size-3.5 ${profile.starred ? 'fill-current' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-zinc-800/70 p-2">
            <button
              type="button"
              onClick={() => setRoute('/gallery')}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white"
            >
              <SparklesIcon className="size-3.5 text-[#F7AE73]" />
              <span>Browse Voice Gallery</span>
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {takes.map((take) => (
            <div
              key={take.id}
              onClick={() =>
                playAudio({
                  title: take.title,
                  subtitle: `${take.voiceName} · ${take.language}`,
                  audioUrl: take.audioUrl,
                  durationSec: take.durationSec,
                  peaks: take.peaks,
                })
              }
              className="group flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-2.5 hover:border-zinc-700 hover:bg-zinc-900/90"
            >
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#251d33] text-[#F47FA3]">
                <PlayIcon className="size-3.5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-zinc-100">{take.title}</div>
                <div className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">{take.text}</div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                  <span>{take.voiceName}</span>
                  <span>·</span>
                  <span>{formatDuration(take.durationSec)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function NowPlayingDock() {
  const { nowPlaying, closeNowPlaying } = useStudio();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const isRealRecordedOrNeural = (url: string) =>
    url.startsWith('data:audio/') || url.startsWith('/assets/aistudio/');

  const startSpokenOverlay = (rateOverride?: number) => {
    if (!nowPlaying?.text) return false;
    if (isRealRecordedOrNeural(nowPlaying.audioUrl)) {
      return false;
    }
    return speakWithBrowserTts({
      text: nowPlaying.text,
      instruct: nowPlaying.instruct || '',
      language: nowPlaying.language || 'English',
      speed: (nowPlaying.speed || 1.0) * (rateOverride ?? playbackRate),
    });
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !nowPlaying) {
      stopBrowserSpeech();
      return;
    }
    stopBrowserSpeech();
    el.src = nowPlaying.audioUrl;
    el.playbackRate = playbackRate;
    setCurrentTime(0);
    setDuration(nowPlaying.durationSec || 5);
    if (nowPlaying.autoPlay) {
      const realWav = isRealRecordedOrNeural(nowPlaying.audioUrl);
      const spoke = realWav ? false : startSpokenOverlay(playbackRate);
      el.volume = spoke ? 0.08 : 1.0;
      el.play()
        .then(() => setPlaying(true))
        .catch(() => {
          const fallback = synthesizeSpeechWav({
            text: nowPlaying.text || nowPlaying.title,
            instruct: nowPlaying.instruct || '',
            speed: nowPlaying.speed || 1.0,
          });
          el.src = fallback.audioUrl;
          el.play()
            .then(() => setPlaying(true))
            .catch(() => setPlaying(spoke));
        });
    }
    return () => {
      stopBrowserSpeech();
    };
  }, [nowPlaying]);

  if (!nowPlaying) return null;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      stopBrowserSpeech();
      setPlaying(false);
    } else {
      const realWav = isRealRecordedOrNeural(nowPlaying.audioUrl);
      const spoke = realWav ? false : startSpokenOverlay(playbackRate);
      el.volume = spoke ? 0.08 : 1.0;
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(spoke));
    }
  };

  const cycleRate = () => {
    const rates = [0.75, 1.0, 1.25, 1.5];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
    if (playing) {
      startSpokenOverlay(next);
    }
  };

  const handleClose = () => {
    stopBrowserSpeech();
    closeNowPlaying();
  };

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div
      role="region"
      aria-label="Now Playing Audio Player"
      className="flex h-14 shrink-0 items-center gap-4 border-t border-zinc-800 bg-[#120F18]/95 px-4 backdrop-blur-xl"
    >
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
            setDuration(e.currentTarget.duration);
          }
        }}
        onError={(e) => {
          const el = e.currentTarget;
          if (!el.src.startsWith('blob:')) {
            const fallback = synthesizeSpeechWav({
              text: nowPlaying.text || nowPlaying.title,
              instruct: nowPlaying.instruct || '',
              speed: nowPlaying.speed || 1.0,
            });
            el.src = fallback.audioUrl;
            if (nowPlaying.autoPlay || playing) {
              el.play().catch(() => {});
            }
          }
        }}
        onEnded={() => setPlaying(false)}
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#F47FA3] to-[#F7AE73] text-zinc-950 shadow-md transition-transform hover:scale-105"
      >
        {playing ? (
          <PauseIcon className="size-4 fill-current" />
        ) : (
          <PlayIcon className="size-4 fill-current" />
        )}
      </button>

      <div className="min-w-0 w-52 shrink-0">
        <div className="truncate text-xs font-semibold text-zinc-100">{nowPlaying.title}</div>
        <div className="truncate text-[11px] text-zinc-400">{nowPlaying.subtitle}</div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-9 text-right text-[11px] tabular-nums text-zinc-400">
          {formatDuration(currentTime)}
        </span>
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const target = ratio * duration;
            setCurrentTime(target);
            if (audioRef.current) audioRef.current.currentTime = target;
          }}
          className="relative flex h-8 flex-1 cursor-pointer items-center gap-[2px] overflow-hidden rounded px-1"
        >
          {nowPlaying.peaks.map((peak, i) => {
            const barRatio = i / nowPlaying.peaks.length;
            const active = barRatio <= progressRatio;
            return (
              <div
                key={i}
                style={{ height: `${Math.max(18, Math.round(peak * 100))}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  active ? 'bg-[#F47FA3]' : 'bg-zinc-700/70 hover:bg-zinc-600'
                }`}
              />
            );
          })}
        </div>
        <span className="w-9 text-[11px] tabular-nums text-zinc-400">
          {formatDuration(duration)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={cycleRate}
          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium tabular-nums text-zinc-300 hover:border-zinc-700 hover:text-white"
          title="Playback speed"
        >
          {playbackRate}x
        </button>
        <a
          href={nowPlaying.audioUrl}
          download={`${nowPlaying.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.wav`}
          className="flex size-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white"
          title="Download WAV"
        >
          <DownloadIcon className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close player"
          className="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function CommandPaletteModal() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setRoute,
    profiles,
    setSelectedVoiceId,
  } = useStudio();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const q = query.trim().toLowerCase();
  const matchedRoutes = ALL_DESTINATIONS.filter(
    (d) =>
      !q ||
      d.label.toLowerCase().includes(q) ||
      d.to.toLowerCase().includes(q) ||
      (d.keywords && d.keywords.toLowerCase().includes(q)),
  );
  const matchedProfiles = profiles.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.instruct.toLowerCase().includes(q),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-20 backdrop-blur-xs"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-[#14111d] shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-center gap-2.5 border-b border-zinc-800 px-3.5 py-2.5">
          <SearchIcon className="size-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to workspace, voice profile, or tool…"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Workspaces
          </div>
          {matchedRoutes.map((dest) => (
            <button
              key={dest.to}
              type="button"
              onClick={() => {
                setRoute(dest.to);
                setCommandPaletteOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-[#231d30] hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <dest.Icon className="size-4 text-[#F47FA3]" />
                <span className="font-medium">{dest.label}</span>
              </span>
              <span className="text-[11px] text-zinc-500">{dest.to}</span>
            </button>
          ))}

          {matchedProfiles.length > 0 && (
            <>
              <div className="mt-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Saved Voice Profiles
              </div>
              {matchedProfiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedVoiceId(p.id);
                    setRoute(p.kind === 'design' ? '/design' : '/clone');
                    setCommandPaletteOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-zinc-200 hover:bg-[#231d30] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Volume2Icon className="size-3.5 text-[#F7AE73]" />
                    <span>{p.name}</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">{p.kind}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    route,
    setRoute,
    sidebarCompact,
    setSidebarCompact,
    contextSidebarOpen,
    setContextSidebarOpen,
    setCommandPaletteOpen,
    toastMessage,
  } = useStudio();

  const currentDest = ALL_DESTINATIONS.find((d) => d.to === route) || ALL_DESTINATIONS[0];
  const showContextSidebar = CONTEXT_SIDEBAR_ROUTES.has(route) && contextSidebarOpen;

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#09090b] text-zinc-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Main WorkspaceSidebar */}
        <aside
          aria-label="VoiceStudio Navigation"
          className={`relative isolate flex h-full shrink-0 flex-col border-r border-zinc-800/70 bg-[#0c0a10] transition-[width] duration-150 ${
            sidebarCompact ? 'w-13' : 'w-56'
          }`}
        >
          {!sidebarCompact && (
            <img
              src="/signal-field.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-36 w-full object-cover object-right opacity-30 [mask-image:linear-gradient(black,transparent)]"
            />
          )}

          {/* Brand Header */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/50 px-3">
            {sidebarCompact ? (
              <button
                type="button"
                onClick={() => setSidebarCompact(false)}
                title="Expand sidebar"
                className="group relative mx-auto flex size-8 items-center justify-center rounded-md hover:bg-zinc-900"
              >
                <img
                  src="/favicon.svg"
                  alt="VoiceStudio"
                  className="size-6 transition-opacity group-hover:opacity-0"
                />
                <PanelLeftOpenIcon className="absolute size-4 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setRoute('/clone')}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <img src="/favicon.svg" alt="" className="size-6 shrink-0" />
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-[14px] font-semibold tracking-tight text-white">
                      VoiceStudio
                    </div>
                    <div className="text-[10px] text-zinc-400 tabular-nums">v0.5.7 · Local</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarCompact(true)}
                  title="Collapse sidebar"
                  className="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                >
                  <PanelLeftIcon className="size-4" />
                </button>
              </>
            )}
          </header>

          {/* Navigation Groups */}
          <nav
            aria-label="Workspaces"
            className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2.5"
          >
            <NavGroup
              title="Voice"
              groupTone="voice"
              Icon={FingerprintIcon}
              items={VOICE_DESTINATIONS}
              compact={sidebarCompact}
              currentRoute={route}
              onNavigate={setRoute}
            />
            <NavGroup
              title="Stories"
              groupTone="stories-group"
              Icon={AudioLinesIcon}
              items={STORY_DESTINATIONS}
              compact={sidebarCompact}
              currentRoute={route}
              onNavigate={setRoute}
            />
            <NavGroup
              title="Dubbing"
              groupTone="dubbing-group"
              Icon={FilmIcon}
              items={DUB_DESTINATIONS}
              compact={sidebarCompact}
              currentRoute={route}
              onNavigate={setRoute}
            />

            <div className="my-1.5 border-t border-zinc-800/60" />

            {LATER_DESTINATIONS.map((dest) => {
              const active = dest.to === route;
              return (
                <button
                  key={dest.to}
                  type="button"
                  title={sidebarCompact ? dest.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setRoute(dest.to)}
                  className={`workspace-nav-item flex w-full items-center rounded-md text-[13px] transition-colors ${
                    sidebarCompact ? 'h-9 justify-center px-0' : 'h-8 gap-2.5 px-2.5'
                  } ${
                    active
                      ? 'bg-[#241d30] font-medium text-white ring-1 ring-inset ring-white/10'
                      : 'text-zinc-300 hover:bg-zinc-900/80 hover:text-white'
                  }`}
                >
                  <dest.Icon
                    className="workspace-nav-icon size-4 shrink-0 text-zinc-400"
                    data-tone={dest.tone}
                    data-motion={dest.motion}
                  />
                  {!sidebarCompact && <span className="truncate">{dest.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Engine & Hardware StatusBar */}
          <StatusBar compact={sidebarCompact} />

          {/* Settings Footer */}
          <div className="flex items-center justify-between border-t border-zinc-800/70 px-2.5 py-2">
            <button
              type="button"
              onClick={() => setRoute('/settings')}
              title="Settings & Model Manager"
              className={`workspace-nav-item flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                route === '/settings'
                  ? 'bg-[#241d30] text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              }`}
            >
              <SettingsIcon
                className="workspace-nav-icon size-3.5"
                data-tone="settings"
                data-motion="turn"
              />
              {!sidebarCompact && <span>Settings & Models</span>}
            </button>
          </div>
        </aside>

        {/* Secondary ContextSidebar (Saved Voices & Recent Takes) */}
        {showContextSidebar && <VoicesContextSidebar />}

        {/* Main Workspace Container */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#09090b]">
          {/* WorkspaceHeader */}
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/70 bg-[#0c0a10]/60 px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              {CONTEXT_SIDEBAR_ROUTES.has(route) && (
                <button
                  type="button"
                  onClick={() => setContextSidebarOpen((v) => !v)}
                  title="Toggle Saved Voices Library"
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                    contextSidebarOpen
                      ? 'border-[#F47FA3]/40 bg-[#F47FA3]/10 text-[#FFD0DB]'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <UsersRoundIcon className="size-3.5" />
                  <span className="hidden sm:inline">Library</span>
                </button>
              )}
              <currentDest.Icon
                className="workspace-nav-icon size-4 shrink-0 text-[#F47FA3]"
                data-tone={currentDest.tone}
              />
              <h1 className="truncate text-[13.5px] font-semibold text-zinc-100">
                {currentDest.label}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRoute('/settings')}
                className="hidden items-center gap-1.5 rounded-md border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white sm:flex"
              >
                <HeartIcon className="size-3 text-[#F47FA3]" />
                <span>646 Languages · k2-fsa/OmniVoice</span>
              </button>
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="flex h-7 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
              >
                <SearchIcon className="size-3.5" />
                <span className="hidden md:inline">Search commands…</span>
                <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                  ⌘K
                </kbd>
              </button>
            </div>
          </header>

          {/* Active Workspace Body */}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>

      {/* Persistent Bottom Audio Player */}
      <NowPlayingDock />

      {/* Command Palette */}
      <CommandPaletteModal />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-5 z-50 flex items-center gap-2 rounded-lg border border-[#F47FA3]/40 bg-[#1a1423] px-3.5 py-2 text-xs font-medium text-zinc-100 shadow-xl">
          <SparklesIcon className="size-3.5 text-[#F47FA3]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
