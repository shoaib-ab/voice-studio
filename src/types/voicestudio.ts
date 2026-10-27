export type WorkspaceRoute =
  | '/clone'
  | '/design'
  | '/personas'
  | '/gallery'
  | '/stories'
  | '/audiobook'
  | '/dub'
  | '/batch'
  | '/transcriptions'
  | '/calls'
  | '/projects'
  | '/tools'
  | '/integrations'
  | '/settings';

export interface VoiceDesignAttributes {
  Gender: string;
  Age: string;
  Pitch: string;
  Style: string;
  EnglishAccent: string;
  ChineseDialect: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  kind: 'clone' | 'design';
  language: string;
  ref_text: string;
  instruct: string;
  personality?: string;
  seed?: number;
  vd_states?: VoiceDesignAttributes;
  audio_url: string;
  image_url?: string | null;
  starred?: boolean;
  locked?: boolean;
  created_at: string;
}

export interface PersonalityPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  instruct: string;
  attrs?: VoiceDesignAttributes;
  script?: string;
  preview_url?: string;
  language?: string;
  is_demo?: boolean;
}

export interface ArchetypeItem {
  id: string;
  name: string;
  icon: string;
  use_case: string;
  instruct: string;
  attrs: VoiceDesignAttributes;
  facets: {
    gender: string | null;
    age: string | null;
    pitch: string | null;
    accent: string | null;
    whisper: boolean;
    lang: string;
  };
  sample_script: string;
  preview_url: string | null;
  is_featured: boolean;
  language: string;
}

export interface GenerationTake {
  id: string;
  title: string;
  text: string;
  voiceId: string;
  voiceName: string;
  kind: 'clone' | 'design' | 'story' | 'audiobook' | 'convert';
  language: string;
  engine: string;
  instruct: string;
  speed: number;
  steps: number;
  guidance: number;
  seed: number;
  watermarked: boolean;
  durationSec: number;
  audioUrl: string;
  starred: boolean;
  createdAt: string;
  peaks: number[];
}

export interface DubSegment {
  id: string;
  speaker: string;
  voiceId: string;
  startSec: number;
  endSec: number;
  sourceText: string;
  translatedText: string;
  direction: string;
  speed: number;
  gain: number;
  fitStatus: 'ok' | 'tight' | 'overflow';
  selected?: boolean;
}

export interface DubProject {
  id: string;
  name: string;
  sourceFileName: string;
  sourceLanguage: string;
  targetLanguages: string[];
  activeTargetLanguage: string;
  timingStrategy: 'strict_slot' | 'smart_fit' | 'concise' | 'stretch_video';
  translateQuality: 'fast' | 'autofit' | 'cinematic' | 'agent';
  translationEngine: string;
  preserveBackground: boolean;
  smartFitFastCap: number;
  smartFitSlowCap: number;
  durationSec: number;
  videoUrl: string;
  dubbedVideoUrls: Record<string, string>;
  segmentsByLang: Record<string, DubSegment[]>;
  updatedAt: string;
}

export interface StoryCharacter {
  id: string;
  name: string;
  voiceId: string;
  color: string;
}

export interface StoryLine {
  id: string;
  type: 'line' | 'chapter';
  characterId: string;
  text: string;
  speedOverride?: number;
  pauseAfterMs?: number;
  direction?: string;
  audioUrl?: string;
}

export interface PronunciationEntry {
  id: string;
  word: string;
  replacement: string;
  ipa?: string;
}

export interface LongformProject {
  id: string;
  kind: 'stories' | 'audiobook';
  title: string;
  author: string;
  narrator: string;
  year: string;
  genre: string;
  description: string;
  defaultVoiceId: string;
  language: string;
  outputFormat: 'mp3' | 'm4b' | 'wav';
  loudnessPreset: 'off' | 'acx' | 'podcast';
  globalSpeed: number;
  gapBetweenLinesMs: number;
  gapBetweenParagraphsMs: number;
  trimSilence: boolean;
  characters: StoryCharacter[];
  lines: StoryLine[];
  manuscript: string;
  pronunciations: PronunciationEntry[];
  lastRenderUrl?: string;
  lastRenderDurationSec?: number;
  updatedAt: string;
}

export interface TranscriptionSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string;
}

export interface TranscriptionEntry {
  id: string;
  fileName: string;
  language: string;
  engine: string;
  rawText: string;
  cleanedText: string;
  durationSec: number;
  audioUrl?: string;
  segments: TranscriptionSegment[];
  createdAt: string;
}

export interface BatchQueueJob {
  id: string;
  fileName: string;
  fileSizeMb: number;
  targetLanguages: string[];
  voiceId: string;
  preserveBackground: boolean;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: 'prepare' | 'transcribe' | 'translate' | 'generate' | 'mix' | 'done';
  progress: number;
  createdAt: string;
}

export interface ModelCatalogItem {
  repo_id: string;
  label: string;
  role: 'TTS' | 'ASR' | 'Translation' | 'Diarisation';
  engines: string[];
  size_gb: number;
  required?: boolean;
  installed: boolean;
  installing?: boolean;
  progress?: number;
  curated_on?: string[];
  note?: string;
  license?: string;
}
