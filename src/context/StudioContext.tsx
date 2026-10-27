import React, { createContext, useContext, useEffect, useState } from 'react';
import type {
  BatchQueueJob,
  DubProject,
  GenerationTake,
  LongformProject,
  ModelCatalogItem,
  TranscriptionEntry,
  VoiceDesignAttributes,
  VoiceProfile,
  WorkspaceRoute,
} from '@/types/voicestudio';
import {
  ARCHETYPE_CATALOG,
  DEFAULT_VD_STATES,
  INITIAL_MODEL_CATALOG,
  INITIAL_VOICE_PROFILES,
  PERSONALITY_PRESETS,
} from '@/data/taxonomy';
import {
  computeDeterministicPeaks,
  synthesizeNeuralSpeech,
  synthesizeSpeechWav,
} from '@/utils/audioSynth';

export interface ActivePlayback {
  title: string;
  subtitle: string;
  audioUrl: string;
  durationSec: number;
  peaks: number[];
  autoPlay?: boolean;
  text?: string;
  instruct?: string;
  language?: string;
  speed?: number;
  profileName?: string;
}

interface StudioContextValue {
  route: WorkspaceRoute;
  setRoute: (route: WorkspaceRoute) => void;
  sidebarCompact: boolean;
  setSidebarCompact: React.Dispatch<React.SetStateAction<boolean>>;
  contextSidebarOpen: boolean;
  setContextSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Voice Profiles
  profiles: VoiceProfile[];
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;
  addProfile: (profile: Omit<VoiceProfile, 'id' | 'created_at'>) => VoiceProfile;
  updateProfile: (id: string, patch: Partial<VoiceProfile>) => void;
  deleteProfile: (id: string) => void;
  toggleStarProfile: (id: string) => void;

  // Voice Design draft state (shared for Gallery -> Design handoff)
  designScript: string;
  setDesignScript: (script: string) => void;
  designStates: VoiceDesignAttributes;
  setDesignStates: React.Dispatch<React.SetStateAction<VoiceDesignAttributes>>;
  designSeed: number;
  setDesignSeed: (seed: number) => void;
  designLanguage: string;
  setDesignLanguage: (lang: string) => void;

  // Clone draft state (shared for Transcriptions -> Clone handoff)
  cloneScript: string;
  setCloneScript: (script: string) => void;

  // Generation Takes History
  takes: GenerationTake[];
  createSynthesisTake: (params: {
    title: string;
    text: string;
    voiceId: string;
    voiceName: string;
    kind: GenerationTake['kind'];
    language: string;
    instruct: string;
    speed?: number;
    steps?: number;
    guidance?: number;
    seed?: number;
    watermarked?: boolean;
    presetAudioUrl?: string;
  }) => Promise<GenerationTake>;
  toggleStarTake: (id: string) => void;
  deleteTake: (id: string) => void;

  // Global Audio Playback Dock
  nowPlaying: ActivePlayback | null;
  playAudio: (playback: ActivePlayback) => void;
  closeNowPlaying: () => void;

  // Dubbing Projects
  dubProjects: DubProject[];
  activeDubId: string;
  setActiveDubId: (id: string) => void;
  updateDubProject: (id: string, updater: (prev: DubProject) => DubProject) => void;

  // Stories & Audiobook Projects
  longformProjects: LongformProject[];
  updateLongformProject: (id: string, updater: (prev: LongformProject) => LongformProject) => void;
  createStoryFromDub: (dub: DubProject) => void;

  // Transcriptions History
  transcriptions: TranscriptionEntry[];
  addTranscription: (entry: Omit<TranscriptionEntry, 'id' | 'createdAt'>) => TranscriptionEntry;
  deleteTranscription: (id: string) => void;
  clearTranscriptions: () => void;

  // Batch Queue
  batchJobs: BatchQueueJob[];
  addBatchJob: (job: Omit<BatchQueueJob, 'id' | 'createdAt' | 'status' | 'stage' | 'progress'>) => void;
  cancelBatchJob: (id: string) => void;
  deleteBatchJob: (id: string) => void;

  // Engines & Models
  activeTtsEngine: string;
  setActiveTtsEngine: (engine: string) => void;
  activeAsrEngine: string;
  setActiveAsrEngine: (engine: string) => void;
  activeTranslationEngine: string;
  setActiveTranslationEngine: (engine: string) => void;
  performanceTier: 'balanced' | 'high_quality' | 'low_vram';
  setPerformanceTier: (tier: 'balanced' | 'high_quality' | 'low_vram') => void;
  models: ModelCatalogItem[];
  installModel: (repoId: string) => void;
  removeModel: (repoId: string) => void;

  // Toast message
  toastMessage: string | null;
  notify: (msg: string) => void;
}

const INITIAL_TAKES: GenerationTake[] = [
  {
    id: 'take_babar_clean_slice',
    title: 'Babar Azam — Clean 8.2s Reference Prompt Slice (24kHz Mono)',
    text: 'آپ کو اچھی پارٹنرشپ کرنی پڑتی ہے، اچھی پارٹنرشپ میں بولنگ کرنی پڑتی ہے، اس پارٹنرشپ کو جو ہے وہ لانگ لے کے جانا پڑتا ہے۔',
    voiceId: 'clone_babar_azam',
    voiceName: 'Babar Azam (Clean 8.2s Prompt Slice)',
    kind: 'clone',
    language: 'Urdu',
    engine: 'omnivoice',
    instruct: 'Clean 8.2s continuous Urdu speech slice (00:24.8–00:33.0) used for zero-shot cloning',
    speed: 1.0,
    steps: 32,
    guidance: 2.5,
    seed: 42,
    watermarked: false,
    durationSec: 8.2,
    audioUrl: '/api/reference/babar-clean.wav',
    starred: true,
    createdAt: '2026-10-26T20:13:00Z',
    peaks: computeDeterministicPeaks('take_babar_clean_slice', 48),
  },
  {
    id: 'take_babar_orig_ref',
    title: 'Babar Azam — Full Uploaded Reference Sample (54.4s WAV)',
    text: 'دیکھیں میرے خیال سے رسپانسبلٹی پوری جو ہے وہ الیون اے سائیڈ کی ہوتی ہے، یہ نہیں کہ بولرز اگر کریں گے بیس آؤٹ تو بیٹسمینوں کا بھی رسپانسبلٹی ہے کہ وہ رنز کریں۔',
    voiceId: 'clone_babar_azam',
    voiceName: 'Babar Azam (Original 54.4s Reference)',
    kind: 'clone',
    language: 'Urdu',
    engine: 'omnivoice',
    instruct: 'Original uploaded reference audio (babar-voice-sample_74691ef6.wav)',
    speed: 1.0,
    steps: 32,
    guidance: 2.5,
    seed: 42,
    watermarked: false,
    durationSec: 54.4,
    audioUrl: '/assets/aistudio/babar-voice-sample_74691ef6.wav',
    starred: true,
    createdAt: '2026-10-26T20:11:00Z',
    peaks: computeDeterministicPeaks('take_babar_orig_ref', 48),
  },
  {
    id: 'take_demo_1',
    title: 'Studio Clone Output (k2-fsa/OmniVoice)',
    text: 'Welcome to VoiceStudio. Local zero-shot voice cloning, voice design, and video dubbing running directly on your hardware.',
    voiceId: 'demo_clone',
    voiceName: 'Studio Reference (Bundled Clone)',
    kind: 'clone',
    language: 'English',
    engine: 'omnivoice',
    instruct: 'middle-aged, moderate pitch, american accent',
    speed: 1.0,
    steps: 16,
    guidance: 2.0,
    seed: 42,
    watermarked: true,
    durationSec: 6.4,
    audioUrl: '/samples/demo_clone_output.wav',
    starred: false,
    createdAt: '2026-10-26T09:10:00Z',
    peaks: computeDeterministicPeaks('take_demo_1', 48),
  },
  {
    id: 'take_demo_2',
    title: 'The Librarian — Chapter 1 Opening',
    text: 'The clock tower struck thirteen, and for the first time in her life, Eleanor wondered if she had been counting wrong all along.',
    voiceId: 'feat_librarian',
    voiceName: 'The Librarian',
    kind: 'design',
    language: 'English',
    engine: 'omnivoice',
    instruct: 'female, middle-aged, low pitch, british accent',
    speed: 1.0,
    steps: 16,
    guidance: 2.0,
    seed: 42,
    watermarked: true,
    durationSec: 7.8,
    audioUrl: '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
    starred: true,
    createdAt: '2026-10-26T09:30:00Z',
    peaks: computeDeterministicPeaks('take_demo_2', 48),
  },
];

const INITIAL_DUB_PROJECT: DubProject = {
  id: 'dub_demo_1',
  name: 'VoiceStudio Tour (Multilingual Dub)',
  sourceFileName: 'source.mp4',
  sourceLanguage: 'English',
  targetLanguages: ['Urdu', 'Español', 'Français', '中文', '日本語'],
  activeTargetLanguage: 'Español',
  timingStrategy: 'smart_fit',
  translateQuality: 'autofit',
  translationEngine: 'nllb',
  preserveBackground: true,
  smartFitFastCap: 1.5,
  smartFitSlowCap: 0.85,
  durationSec: 12.8,
  videoUrl: '/samples/demo/dubbing/source.mp4',
  dubbedVideoUrls: {
    Urdu: '/samples/demo/dubbing/source.mp4',
    Español: '/samples/demo/dubbing/dubbed_es.mp4',
    Français: '/samples/demo/dubbing/dubbed_fr.mp4',
    中文: '/samples/demo/dubbing/dubbed_zh.mp4',
    日本語: '/samples/demo/dubbing/dubbed_ja.mp4',
  },
  segmentsByLang: {
    Urdu: [
      {
        id: 'seg_ur_1',
        speaker: 'Speaker 1',
        voiceId: 'feat_urdu_narrator',
        startSec: 0.2,
        endSec: 4.5,
        sourceText:
          'VoiceStudio is a desktop app for voice cloning, video dubbing, and voice design.',
        translatedText:
          'وائس اسٹوڈیو آواز کی کلوننگ، ویڈیو ڈبنگ اور وائس ڈیزائن کے لیے ایک ڈیسک ٹاپ ایپ ہے۔',
        direction: 'announcing',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_ur_2',
        speaker: 'Speaker 1',
        voiceId: 'feat_urdu_narrator',
        startSec: 4.7,
        endSec: 8.6,
        sourceText: 'It runs entirely on your machine. No accounts, no cloud, no API keys.',
        translatedText:
          'یہ مکمل طور پر آپ کے کمپیوٹر پر چلتی ہے۔ نہ کوئی اکاؤنٹ، نہ کلاؤڈ، اور نہ ہی کوئی اے پی آئی کلید۔',
        direction: 'calm',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_ur_3',
        speaker: 'Speaker 1',
        voiceId: 'feat_urdu_narrator',
        startSec: 8.9,
        endSec: 12.5,
        sourceText: 'Just open the app and start creating.',
        translatedText: 'بس ایپ کھولیں اور تخلیق کرنا شروع کریں۔',
        direction: 'energetic',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
    ],
    Español: [
      {
        id: 'seg_1',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 0.2,
        endSec: 4.5,
        sourceText:
          'VoiceStudio is a desktop app for voice cloning, video dubbing, and voice design.',
        translatedText:
          'VoiceStudio es una aplicación de escritorio para clonación de voz, doblaje de vídeo y diseño de voz.',
        direction: 'announcing',
        speed: 1.05,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_2',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 4.7,
        endSec: 8.6,
        sourceText: 'It runs entirely on your machine. No accounts, no cloud, no API keys.',
        translatedText:
          'Funciona completamente en tu máquina. Sin cuentas, sin nube, sin claves de API.',
        direction: 'calm',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_3',
        speaker: 'Speaker 1',
        voiceId: 'feat_anchor',
        startSec: 8.9,
        endSec: 12.5,
        sourceText: 'Just open the app and start creating.',
        translatedText: 'Solo abre la aplicación y comienza a crear.',
        direction: 'energetic',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
    ],
    Français: [
      {
        id: 'seg_fr_1',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 0.2,
        endSec: 4.5,
        sourceText:
          'VoiceStudio is a desktop app for voice cloning, video dubbing, and voice design.',
        translatedText:
          'VoiceStudio est une application de bureau pour le clonage de voix, le doublage vidéo et la conception vocale.',
        direction: 'announcing',
        speed: 1.08,
        gain: 1.0,
        fitStatus: 'tight',
      },
      {
        id: 'seg_fr_2',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 4.7,
        endSec: 8.6,
        sourceText: 'It runs entirely on your machine. No accounts, no cloud, no API keys.',
        translatedText:
          "Elle fonctionne entièrement sur votre machine. Pas de compte, pas de cloud, pas de clé d'API.",
        direction: 'calm',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_fr_3',
        speaker: 'Speaker 1',
        voiceId: 'feat_anchor',
        startSec: 8.9,
        endSec: 12.5,
        sourceText: 'Just open the app and start creating.',
        translatedText: "Ouvrez l'application et commencez à créer.",
        direction: 'energetic',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
    ],
    中文: [
      {
        id: 'seg_zh_1',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 0.2,
        endSec: 4.5,
        sourceText:
          'VoiceStudio is a desktop app for voice cloning, video dubbing, and voice design.',
        translatedText: 'VoiceStudio 是一款桌面应用，用于语音克隆、视频配音和声音设计。',
        direction: 'announcing',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_zh_2',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 4.7,
        endSec: 8.6,
        sourceText: 'It runs entirely on your machine. No accounts, no cloud, no API keys.',
        translatedText: '它完全在你的电脑上运行。无需账户，无需云端，无需 API 密钥。',
        direction: 'calm',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_zh_3',
        speaker: 'Speaker 1',
        voiceId: 'feat_anchor',
        startSec: 8.9,
        endSec: 12.5,
        sourceText: 'Just open the app and start creating.',
        translatedText: '打开应用即可开始创作。',
        direction: 'energetic',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
    ],
    日本語: [
      {
        id: 'seg_ja_1',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 0.2,
        endSec: 4.5,
        sourceText:
          'VoiceStudio is a desktop app for voice cloning, video dubbing, and voice design.',
        translatedText:
          'VoiceStudioは、ボイスクローン、ビデオ吹き替え、ボイスデザインのためのデスクトップアプリです。',
        direction: 'announcing',
        speed: 1.04,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_ja_2',
        speaker: 'Speaker 1',
        voiceId: 'demo_clone',
        startSec: 4.7,
        endSec: 8.6,
        sourceText: 'It runs entirely on your machine. No accounts, no cloud, no API keys.',
        translatedText:
          'すべてお使いのコンピュータ上で動作します。アカウント、クラウド、APIキーは不要です。',
        direction: 'calm',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
      {
        id: 'seg_ja_3',
        speaker: 'Speaker 1',
        voiceId: 'feat_anchor',
        startSec: 8.9,
        endSec: 12.5,
        sourceText: 'Just open the app and start creating.',
        translatedText: 'アプリを開けば、すぐに制作を始められます。',
        direction: 'energetic',
        speed: 1.0,
        gain: 1.0,
        fitStatus: 'ok',
      },
    ],
  },
  updatedAt: '2026-10-26T09:45:00Z',
};

const INITIAL_LONGFORM_PROJECTS: LongformProject[] = [
  {
    id: 'story_default',
    kind: 'stories',
    title: 'The Stone Bridge at Midnight',
    author: 'Eleanor Vance',
    narrator: 'The Librarian & Cast',
    year: '2026',
    genre: 'Mystery / Drama',
    description: 'A multi-character audio drama rendered with seamless pause and loudness mastering.',
    defaultVoiceId: 'feat_librarian',
    language: 'English',
    outputFormat: 'm4b',
    loudnessPreset: 'acx',
    globalSpeed: 1.0,
    gapBetweenLinesMs: 320,
    gapBetweenParagraphsMs: 650,
    trimSilence: true,
    characters: [
      { id: 'char_narrator', name: 'Narrator', voiceId: 'feat_librarian', color: '#F47FA3' },
      { id: 'char_captain', name: 'Captain Harland', voiceId: 'feat_crusty', color: '#F7AE73' },
      { id: 'char_elena', name: 'Elena', voiceId: 'feat_podcaster', color: '#38bdf8' },
    ],
    lines: [
      {
        id: 'line_ch1',
        type: 'chapter',
        characterId: 'char_narrator',
        text: '# Chapter 1: Beneath the Old Stone Bridge',
      },
      {
        id: 'line_1',
        type: 'line',
        characterId: 'char_narrator',
        text: 'The valley had been quiet for a hundred years, and tonight, for the first time, something stirred beneath the old stone bridge.',
        audioUrl: '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
      },
      {
        id: 'line_2',
        type: 'line',
        characterId: 'char_captain',
        text: 'You came a long way for an answer you already had. Sit. The fire is warm, and the truth is not.',
        speedOverride: 0.95,
        audioUrl: '/samples/voice_design/demo_voice_design_gravelly_villain.wav',
      },
      {
        id: 'line_3',
        type: 'line',
        characterId: 'char_elena',
        text: 'Wait—nobody told the engineers the beacon was still transmitting from across the harbor!',
        speedOverride: 1.05,
        audioUrl: '/samples/voice_design/demo_voice_design_aussie_podcaster.wav',
      },
    ],
    manuscript: '',
    pronunciations: [
      { id: 'pron_1', word: 'OmniVoice', replacement: 'Om-nee-voyce', ipa: 'ˈɒmniˌvɔɪs' },
      { id: 'pron_2', word: 'CTranslate2', replacement: 'See-Translate-Two' },
    ],
    lastRenderUrl: '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
    lastRenderDurationSec: 18.4,
    updatedAt: '2026-10-26T08:00:00Z',
  },
  {
    id: 'audiobook_default',
    kind: 'audiobook',
    title: 'Chronicles of the Coastal Observatory',
    author: 'Dr. Arthur Pendelton',
    narrator: 'The Librarian',
    year: '2026',
    genre: 'Science Fiction',
    description: 'Full-length audiobook with embedded M4B chapter markers and two-pass ACX mastering.',
    defaultVoiceId: 'feat_librarian',
    language: 'English',
    outputFormat: 'm4b',
    loudnessPreset: 'acx',
    globalSpeed: 1.0,
    gapBetweenLinesMs: 250,
    gapBetweenParagraphsMs: 600,
    trimSilence: true,
    characters: [
      { id: 'char_ab_narrator', name: 'Narrator', voiceId: 'feat_librarian', color: '#F47FA3' },
    ],
    lines: [],
    manuscript: `# Chapter 1: The Thirteenth Bell\n\nThe clock tower struck thirteen, and for the first time in her life, Eleanor wondered if she had been counting wrong all along. Along the cliffside, the receiver dishes turned slowly toward the northern horizon.\n\n[voice: The Anchor] Good evening. Topping our broadcast tonight: scientists at the coastal observatory have confirmed the signal is, in fact, repeating.\n\n# Chapter 2: Echoes in the Harbor\n\nBy dawn, the mist had settled over the stone jetty. Every instrument in the laboratory hummed in quiet resonance, waiting for the next pulse.`,
    pronunciations: [
      { id: 'pron_ab_1', word: 'Pendelton', replacement: 'Pen-del-ton' },
    ],
    lastRenderUrl: '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
    lastRenderDurationSec: 26.2,
    updatedAt: '2026-10-26T08:30:00Z',
  },
];

const INITIAL_TRANSCRIPTIONS: TranscriptionEntry[] = [
  {
    id: 'tr_demo_1',
    fileName: 'en_technical.wav',
    language: 'English',
    engine: 'faster-whisper',
    rawText:
      'uh so the local Whisper large v3 pipeline computes word timestamps and speaker diarization directly on the GPU without sending audio over the network.',
    cleanedText:
      'So the local Whisper large-v3 pipeline computes word timestamps and speaker diarization directly on the GPU without sending audio over the network.',
    durationSec: 7.4,
    audioUrl: '/samples/dictation/en_technical.wav',
    segments: [
      {
        id: 'tseg_1',
        startSec: 0.0,
        endSec: 3.8,
        text: 'So the local Whisper large-v3 pipeline computes word timestamps',
        speaker: 'Speaker 1',
      },
      {
        id: 'tseg_2',
        startSec: 3.8,
        endSec: 7.4,
        text: 'and speaker diarization directly on the GPU without sending audio over the network.',
        speaker: 'Speaker 1',
      },
    ],
    createdAt: '2026-10-26T07:50:00Z',
  },
  {
    id: 'tr_demo_2',
    fileName: 'en_conversational.wav',
    language: 'English',
    engine: 'sherpa-onnx',
    rawText:
      'hey there umm i wanted to check if the voice cloning reference clip is ready for chapter two period',
    cleanedText:
      'Hey there, I wanted to check if the voice cloning reference clip is ready for chapter two.',
    durationSec: 5.2,
    audioUrl: '/samples/dictation/en_conversational.wav',
    segments: [
      {
        id: 'tseg_2_1',
        startSec: 0.0,
        endSec: 5.2,
        text: 'Hey there, I wanted to check if the voice cloning reference clip is ready for chapter two.',
        speaker: 'Speaker 1',
      },
    ],
    createdAt: '2026-10-26T07:20:00Z',
  },
  {
    id: 'tr_demo_3',
    fileName: 'fr_reservation.wav',
    language: 'French',
    engine: 'faster-whisper',
    rawText:
      'Bonjour, je voudrais confirmer notre séance d’enregistrement au studio pour demain matin à dix heures.',
    cleanedText:
      'Bonjour, je voudrais confirmer notre séance d’enregistrement au studio pour demain matin à dix heures.',
    durationSec: 5.8,
    audioUrl: '/samples/dictation/fr_reservation.wav',
    segments: [
      {
        id: 'tseg_3_1',
        startSec: 0.0,
        endSec: 5.8,
        text: 'Bonjour, je voudrais confirmer notre séance d’enregistrement au studio pour demain matin à dix heures.',
        speaker: 'Speaker 1',
      },
    ],
    createdAt: '2026-10-25T19:15:00Z',
  },
];

const INITIAL_BATCH_JOBS: BatchQueueJob[] = [
  {
    id: 'batch_1',
    fileName: 'keynote_opening_2026.mp4',
    fileSizeMb: 42.8,
    targetLanguages: ['Español', 'Français', '日本語'],
    voiceId: 'demo_clone',
    preserveBackground: true,
    status: 'completed',
    stage: 'done',
    progress: 100,
    createdAt: '2026-10-26T08:12:00Z',
  },
  {
    id: 'batch_2',
    fileName: 'product_walkthrough_v2.mp4',
    fileSizeMb: 18.4,
    targetLanguages: ['中文', 'German'],
    voiceId: 'feat_anchor',
    preserveBackground: true,
    status: 'completed',
    stage: 'done',
    progress: 100,
    createdAt: '2026-10-26T09:05:00Z',
  },
];

const StudioContext = createContext<StudioContextValue | null>(null);

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<WorkspaceRoute>('/clone');
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [contextSidebarOpen, setContextSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const [profiles, setProfiles] = useState<VoiceProfile[]>(() => {
    const loaded = loadJson('voicestudio.profiles.v2', INITIAL_VOICE_PROFILES);
    const existingIds = new Set(loaded.map((p) => p.id));
    const merged = [
      ...INITIAL_VOICE_PROFILES.filter((p) => !existingIds.has(p.id)),
      ...loaded,
    ];
    return merged.map((p) => {
      if (p.id === 'clone_babar_azam') {
        return {
          ...p,
          name: 'Babar Azam (Your Uploaded Sample · اردو / EN)',
          audio_url:
            p.audio_url && p.audio_url.startsWith('data:audio/')
              ? p.audio_url
              : '/assets/aistudio/babar-voice-sample_74691ef6.wav',
          ref_text:
            'آپ کو اچھی پارٹنرشپ کرنی پڑتی ہے، اچھی پارٹنرشپ میں بولنگ کرنی پڑتی ہے، اس پارٹنرشپ کو جو ہے وہ لانگ لے کے جانا پڑتا ہے۔',
        };
      }
      return p;
    });
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('clone_babar_azam');

  const [designScript, setDesignScript] = useState<string>(
    'The clock tower struck thirteen, and for the first time in her life, Eleanor wondered if she had been counting wrong all along.',
  );
  const [designStates, setDesignStates] = useState<VoiceDesignAttributes>(() => ({
    ...DEFAULT_VD_STATES,
    Gender: 'female',
    Age: 'middle-aged',
    Pitch: 'low pitch',
    EnglishAccent: 'british accent',
  }));
  const [designSeed, setDesignSeed] = useState<number>(42);
  const [designLanguage, setDesignLanguage] = useState<string>('English');

  const [cloneScript, setCloneScript] = useState<string>(
    'الحمد للہ، لڑکوں نے آج بہت اچھی کرکٹ کھیلی۔ کرکٹ میں اتار چڑھاؤ آتا رہتا ہے، لیکن ہم اپنی غلطیوں سے سیکھ کر اگلے میچ میں مضبوط کم بیک کریں گے۔',
  );

  const [takes, setTakes] = useState<GenerationTake[]>(() => {
    const loaded = loadJson('voicestudio.takes.v2', INITIAL_TAKES);
    const existingIds = new Set(loaded.map((t) => t.id));
    return [
      ...INITIAL_TAKES.filter((t) => !existingIds.has(t.id)),
      ...loaded.filter((t) => !t.audioUrl.startsWith('blob:')),
    ];
  });
  const [nowPlaying, setNowPlaying] = useState<ActivePlayback | null>(null);

  const [dubProjects, setDubProjects] = useState<DubProject[]>(() => {
    const loaded = loadJson('voicestudio.dub.v1', [INITIAL_DUB_PROJECT]);
    return loaded.map((proj) => {
      if (proj.id === 'dub_demo_1' && !proj.targetLanguages.includes('Urdu')) {
        return {
          ...proj,
          targetLanguages: ['Urdu', ...proj.targetLanguages],
          dubbedVideoUrls: {
            ...proj.dubbedVideoUrls,
            Urdu: '/samples/demo/dubbing/source.mp4',
          },
          segmentsByLang: {
            ...proj.segmentsByLang,
            Urdu: INITIAL_DUB_PROJECT.segmentsByLang.Urdu,
          },
        };
      }
      return proj;
    });
  });
  const [activeDubId, setActiveDubId] = useState<string>('dub_demo_1');

  const [longformProjects, setLongformProjects] = useState<LongformProject[]>(() =>
    loadJson('voicestudio.longform.v1', INITIAL_LONGFORM_PROJECTS),
  );

  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>(() =>
    loadJson('voicestudio.transcriptions.v1', INITIAL_TRANSCRIPTIONS),
  );

  const [batchJobs, setBatchJobs] = useState<BatchQueueJob[]>(() =>
    loadJson('voicestudio.batch.v1', INITIAL_BATCH_JOBS),
  );

  const [activeTtsEngine, setActiveTtsEngine] = useState<string>('omnivoice');
  const [activeAsrEngine, setActiveAsrEngine] = useState<string>('faster-whisper');
  const [activeTranslationEngine, setActiveTranslationEngine] = useState<string>('nllb');
  const [performanceTier, setPerformanceTier] = useState<'balanced' | 'high_quality' | 'low_vram'>(
    'balanced',
  );
  const [models, setModels] = useState<ModelCatalogItem[]>(INITIAL_MODEL_CATALOG);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('voicestudio.profiles.v2', JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'voicestudio.takes.v2',
        JSON.stringify(takes.filter((t) => !t.audioUrl.startsWith('blob:'))),
      );
    } catch {}
  }, [takes]);

  useEffect(() => {
    try {
      localStorage.setItem('voicestudio.dub.v1', JSON.stringify(dubProjects));
    } catch {}
  }, [dubProjects]);

  useEffect(() => {
    try {
      localStorage.setItem('voicestudio.longform.v1', JSON.stringify(longformProjects));
    } catch {}
  }, [longformProjects]);

  useEffect(() => {
    try {
      localStorage.setItem('voicestudio.transcriptions.v1', JSON.stringify(transcriptions));
    } catch {}
  }, [transcriptions]);

  const notify = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const addProfile = (data: Omit<VoiceProfile, 'id' | 'created_at'>): VoiceProfile => {
    const created: VoiceProfile = {
      ...data,
      id: `vp_${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    setProfiles((prev) => [created, ...prev]);
    setSelectedVoiceId(created.id);
    notify(`Saved voice profile "${created.name}"`);
    return created;
  };

  const updateProfile = (id: string, patch: Partial<VoiceProfile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const deleteProfile = (id: string) => {
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedVoiceId === id && next[0]) {
        setSelectedVoiceId(next[0].id);
      }
      return next;
    });
    notify('Voice profile removed');
  };

  const toggleStarProfile = (id: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)),
    );
  };

  const createSynthesisTake: StudioContextValue['createSynthesisTake'] = async ({
    title,
    text,
    voiceId,
    voiceName,
    kind,
    language,
    instruct,
    speed = 1.0,
    steps = 32,
    guidance = 2.5,
    seed = 42,
    watermarked = true,
    presetAudioUrl,
  }) => {
    const sourceProfile = profiles.find((p) => p.id === voiceId);
    const synth = synthesizeSpeechWav({ text, instruct, speed, seed });
    const audioUrl = presetAudioUrl || synth.audioUrl;
    const takeId = `take_${Date.now().toString(36)}`;
    const take: GenerationTake = {
      id: takeId,
      title,
      text,
      voiceId,
      voiceName,
      kind,
      language,
      engine: activeTtsEngine,
      instruct,
      speed,
      steps,
      guidance,
      seed,
      watermarked,
      durationSec: synth.durationSec,
      audioUrl,
      starred: false,
      createdAt: new Date().toISOString(),
      peaks: synth.peaks,
    };

    const refUrl = sourceProfile?.audio_url || '';
    const refBase64 = refUrl.startsWith('data:audio/') ? refUrl : '';

    const neural = await synthesizeNeuralSpeech({
      text,
      instruct,
      language,
      profileName: voiceName,
      refText: sourceProfile?.ref_text || '',
      refAudioUrl: refUrl,
      refAudioBase64: refBase64,
      kind,
      steps,
      guidance,
      speed,
      seed,
    });

    const completedTake: GenerationTake = {
      ...take,
      engine: neural.engineLabel || activeTtsEngine,
      audioUrl: neural.audioUrl,
      durationSec: neural.durationSec,
      peaks: neural.peaks,
    };
    setTakes((prev) => [completedTake, ...prev.filter((t) => t.id !== takeId)]);
    setNowPlaying({
      title: completedTake.title,
      subtitle: `${completedTake.voiceName} · ${completedTake.language} · ${completedTake.engine}`,
      audioUrl: neural.audioUrl,
      durationSec: neural.durationSec,
      peaks: neural.peaks,
      autoPlay: true,
      text: completedTake.text,
      instruct: completedTake.instruct,
      language: completedTake.language,
      speed: completedTake.speed,
      profileName: completedTake.voiceName,
    });
    if (neural.engineLabel) {
      notify(`Ready: ${neural.engineLabel}`);
    }

    return completedTake;
  };

  const toggleStarTake = (id: string) => {
    setTakes((prev) => prev.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)));
  };

  const deleteTake = (id: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== id));
  };

  const playAudio = (playback: ActivePlayback) => {
    let resolvedText = playback.text;
    let resolvedInstruct = playback.instruct;
    let resolvedLang = playback.language;
    let resolvedSpeed = playback.speed ?? 1.0;
    let resolvedProfileName = playback.profileName || playback.title;
    let resolvedKind: GenerationTake['kind'] = 'clone';

    const matchedTake = takes.find(
      (t) => t.audioUrl === playback.audioUrl || t.title === playback.title,
    );
    if (matchedTake) {
      resolvedText = resolvedText ?? matchedTake.text;
      resolvedInstruct = resolvedInstruct ?? matchedTake.instruct;
      resolvedLang = resolvedLang ?? matchedTake.language;
      resolvedSpeed = matchedTake.speed || 1.0;
      resolvedProfileName = matchedTake.voiceName;
      resolvedKind = matchedTake.kind;
    }

    if (!resolvedText) {
      const matchedProfile = profiles.find(
        (p) =>
          p.name === playback.title ||
          playback.title.startsWith(p.name) ||
          p.audio_url === playback.audioUrl,
      );
      if (matchedProfile) {
        resolvedText = matchedProfile.ref_text;
        resolvedInstruct = resolvedInstruct ?? matchedProfile.instruct;
        resolvedLang = resolvedLang ?? matchedProfile.language;
        resolvedProfileName = matchedProfile.name;
        resolvedKind = matchedProfile.kind === 'clone' ? 'clone' : 'design';
      }
    }

    if (!resolvedText) {
      const matchedPreset = PERSONALITY_PRESETS.find(
        (pr) => pr.name === playback.title || pr.preview_url === playback.audioUrl,
      );
      if (matchedPreset) {
        resolvedText = matchedPreset.script || matchedPreset.description;
        resolvedInstruct = resolvedInstruct ?? matchedPreset.instruct;
        resolvedLang = resolvedLang ?? (matchedPreset.language || 'English');
        resolvedProfileName = matchedPreset.name;
        resolvedKind = 'design';
      }
    }

    if (!resolvedText) {
      const matchedArch = ARCHETYPE_CATALOG.find((a) => a.name === playback.title);
      if (matchedArch) {
        resolvedText = matchedArch.sample_script;
        resolvedInstruct = resolvedInstruct ?? matchedArch.instruct;
        resolvedLang = resolvedLang ?? matchedArch.language;
        resolvedProfileName = matchedArch.name;
        resolvedKind = 'design';
      }
    }

    if (!resolvedText) {
      const matchedTr = transcriptions.find(
        (tr) => tr.audioUrl === playback.audioUrl || tr.fileName === playback.title,
      );
      if (matchedTr) {
        resolvedText = matchedTr.cleanedText || matchedTr.rawText;
        resolvedLang = resolvedLang ?? matchedTr.language;
      }
    }

    const finalText = resolvedText || playback.title;
    const finalInstruct = resolvedInstruct || '';
    const finalLang = resolvedLang || 'English';

    // Real audio files (data:audio/, blob:, /api/reference/, or uploaded Babar reference files) play directly!
    const isRealAudio =
      playback.audioUrl.startsWith('data:audio/') ||
      playback.audioUrl.startsWith('blob:') ||
      playback.audioUrl.startsWith('/api/reference/') ||
      playback.audioUrl === '/assets/aistudio/babar-voice-sample_74691ef6.wav' ||
      playback.audioUrl === '/assets/aistudio/babar-voice-sample_1de63eeb.m4a';

    if (!isRealAudio) {
      setNowPlaying({
        ...playback,
        autoPlay: false,
        text: finalText,
        instruct: finalInstruct,
        language: finalLang,
        speed: resolvedSpeed,
        profileName: resolvedProfileName,
      });
      synthesizeNeuralSpeech({
        text: finalText,
        instruct: finalInstruct,
        language: finalLang,
        profileName: resolvedProfileName,
        kind: resolvedKind,
        speed: resolvedSpeed,
      }).then((neural) => {
        setNowPlaying({
          ...playback,
          audioUrl: neural.audioUrl,
          durationSec: neural.durationSec,
          peaks: neural.peaks,
          autoPlay: true,
          text: finalText,
          instruct: finalInstruct,
          language: finalLang,
          speed: resolvedSpeed,
          profileName: resolvedProfileName,
        });
      });
      return;
    }

    setNowPlaying({
      ...playback,
      autoPlay: true,
      text: finalText,
      instruct: finalInstruct,
      language: finalLang,
      speed: resolvedSpeed,
      profileName: resolvedProfileName,
    });
  };

  const closeNowPlaying = () => setNowPlaying(null);

  const updateDubProject = (id: string, updater: (prev: DubProject) => DubProject) => {
    setDubProjects((prev) =>
      prev.map((proj) =>
        proj.id === id ? { ...updater(proj), updatedAt: new Date().toISOString() } : proj,
      ),
    );
  };

  const updateLongformProject = (
    id: string,
    updater: (prev: LongformProject) => LongformProject,
  ) => {
    setLongformProjects((prev) =>
      prev.map((proj) =>
        proj.id === id ? { ...updater(proj), updatedAt: new Date().toISOString() } : proj,
      ),
    );
  };

  const createStoryFromDub = (dub: DubProject) => {
    const segments = dub.segmentsByLang[dub.activeTargetLanguage] || [];
    const speakerNames = Array.from(new Set(segments.map((s) => s.speaker)));
    const colors = ['#F47FA3', '#F7AE73', '#38bdf8', '#a78bfa', '#34d399'];
    const chars = speakerNames.map((sp, i) => {
      const seg = segments.find((s) => s.speaker === sp);
      return {
        id: `char_dub_${i}`,
        name: sp,
        voiceId: seg?.voiceId || selectedVoiceId,
        color: colors[i % colors.length],
      };
    });
    const lines = segments.map((s, idx) => {
      const ch = chars.find((c) => c.name === s.speaker) || chars[0];
      return {
        id: `line_dub_${idx}`,
        type: 'line' as const,
        characterId: ch?.id || 'char_narrator',
        text: s.translatedText || s.sourceText,
        direction: s.direction,
        speedOverride: s.speed !== 1 ? s.speed : undefined,
      };
    });
    updateLongformProject('story_default', (prev) => ({
      ...prev,
      title: `${dub.name} (${dub.activeTargetLanguage} Story)`,
      characters: chars.length ? chars : prev.characters,
      lines: lines.length ? lines : prev.lines,
    }));
    setRoute('/stories');
    notify(`Created Story from "${dub.name}" (${segments.length} lines)`);
  };

  const addTranscription: StudioContextValue['addTranscription'] = (entry) => {
    const created: TranscriptionEntry = {
      ...entry,
      id: `tr_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    setTranscriptions((prev) => [created, ...prev.slice(0, 199)]);
    return created;
  };

  const deleteTranscription = (id: string) => {
    setTranscriptions((prev) => prev.filter((t) => t.id !== id));
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
    notify('Cleared transcription history');
  };

  const addBatchJob: StudioContextValue['addBatchJob'] = (job) => {
    const id = `batch_${Date.now().toString(36)}`;
    const created: BatchQueueJob = {
      ...job,
      id,
      status: 'running',
      stage: 'prepare',
      progress: 12,
      createdAt: new Date().toISOString(),
    };
    setBatchJobs((prev) => [created, ...prev]);
    notify(`Added "${job.fileName}" to batch queue`);

    // Simulate realistic stage progression
    const stages: [BatchQueueJob['stage'], number][] = [
      ['transcribe', 35],
      ['translate', 60],
      ['generate', 85],
      ['mix', 95],
      ['done', 100],
    ];
    stages.forEach(([stage, prog], idx) => {
      setTimeout(() => {
        setBatchJobs((prev) =>
          prev.map((j) =>
            j.id === id && j.status === 'running'
              ? {
                  ...j,
                  stage,
                  progress: prog,
                  status: stage === 'done' ? 'completed' : 'running',
                }
              : j,
          ),
        );
      }, (idx + 1) * 1100);
    });
  };

  const cancelBatchJob = (id: string) => {
    setBatchJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'failed', stage: 'done' } : j)),
    );
    notify('Batch job cancelled');
  };

  const deleteBatchJob = (id: string) => {
    setBatchJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const installModel = (repoId: string) => {
    setModels((prev) =>
      prev.map((m) => (m.repo_id === repoId ? { ...m, installing: true, progress: 15 } : m)),
    );
    [45, 78, 100].forEach((prog, idx) => {
      setTimeout(() => {
        setModels((prev) =>
          prev.map((m) =>
            m.repo_id === repoId
              ? prog === 100
                ? { ...m, installing: false, installed: true, progress: 100 }
                : { ...m, progress: prog }
              : m,
          ),
        );
        if (prog === 100) {
          notify(`Installed model ${repoId}`);
        }
      }, (idx + 1) * 700);
    });
  };

  const removeModel = (repoId: string) => {
    setModels((prev) =>
      prev.map((m) =>
        m.repo_id === repoId && !m.required ? { ...m, installed: false, progress: 0 } : m,
      ),
    );
    notify(`Removed model weights for ${repoId}`);
  };

  return (
    <StudioContext.Provider
      value={{
        route,
        setRoute,
        sidebarCompact,
        setSidebarCompact,
        contextSidebarOpen,
        setContextSidebarOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        profiles,
        selectedVoiceId,
        setSelectedVoiceId,
        addProfile,
        updateProfile,
        deleteProfile,
        toggleStarProfile,
        designScript,
        setDesignScript,
        designStates,
        setDesignStates,
        designSeed,
        setDesignSeed,
        designLanguage,
        setDesignLanguage,
        cloneScript,
        setCloneScript,
        takes,
        createSynthesisTake,
        toggleStarTake,
        deleteTake,
        nowPlaying,
        playAudio,
        closeNowPlaying,
        dubProjects,
        activeDubId,
        setActiveDubId,
        updateDubProject,
        longformProjects,
        updateLongformProject,
        createStoryFromDub,
        transcriptions,
        addTranscription,
        deleteTranscription,
        clearTranscriptions,
        batchJobs,
        addBatchJob,
        cancelBatchJob,
        deleteBatchJob,
        activeTtsEngine,
        setActiveTtsEngine,
        activeAsrEngine,
        setActiveAsrEngine,
        activeTranslationEngine,
        setActiveTranslationEngine,
        performanceTier,
        setPerformanceTier,
        models,
        installModel,
        removeModel,
        toastMessage,
        notify,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioProvider');
  return ctx;
}
