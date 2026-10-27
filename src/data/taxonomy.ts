import type {
  ArchetypeItem,
  ModelCatalogItem,
  PersonalityPreset,
  VoiceDesignAttributes,
  VoiceProfile,
} from '@/types/voicestudio';

export const CATEGORY_ORDER = [
  'Gender',
  'Age',
  'Pitch',
  'Style',
  'EnglishAccent',
  'ChineseDialect',
] as const;

export const VOICE_DESIGN_OPTIONS: Record<keyof VoiceDesignAttributes, string[]> = {
  Gender: ['Auto', 'female', 'male'],
  Age: ['Auto', 'child', 'teenager', 'young adult', 'middle-aged', 'elderly'],
  Pitch: [
    'Auto',
    'very low pitch',
    'low pitch',
    'moderate pitch',
    'high pitch',
    'very high pitch',
  ],
  Style: ['Auto', 'whisper'],
  EnglishAccent: [
    'Auto',
    'american accent',
    'australian accent',
    'british accent',
    'canadian accent',
    'chinese accent',
    'indian accent',
    'japanese accent',
    'korean accent',
    'portuguese accent',
    'russian accent',
  ],
  ChineseDialect: [
    'Auto',
    '东北话',
    '云南话',
    '四川话',
    '宁夏话',
    '山东话',
    '桂林话',
    '河南话',
    '济南话',
    '甘肃话',
    '石家庄话',
    '贵州话',
    '陕西话',
    '青岛话',
  ],
};

export const DEFAULT_VD_STATES: VoiceDesignAttributes = {
  Gender: 'Auto',
  Age: 'Auto',
  Pitch: 'Auto',
  Style: 'Auto',
  EnglishAccent: 'Auto',
  ChineseDialect: 'Auto',
};

export function buildInstructFromAttributes(attrs: VoiceDesignAttributes): string {
  const tokens: string[] = [];
  for (const key of CATEGORY_ORDER) {
    const val = attrs[key];
    if (val && val !== 'Auto') {
      tokens.push(val);
    }
  }
  return tokens.join(', ');
}

export function instructToAttributes(instruct: string): VoiceDesignAttributes {
  const attrs: VoiceDesignAttributes = { ...DEFAULT_VD_STATES };
  if (!instruct) return attrs;
  const parts = instruct
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const token of parts) {
    for (const key of CATEGORY_ORDER) {
      if (VOICE_DESIGN_OPTIONS[key].includes(token)) {
        attrs[key] = token;
      }
    }
  }
  return attrs;
}

/**
 * Deterministic natural-language description → Voice Design parameter mapper
 * Ported directly from backend/core/describe_voice.py
 */
const GENDER_RULES: [string, string[]][] = [
  [
    'female',
    [
      'female',
      'woman',
      'women',
      'lady',
      'ladies',
      'girl',
      'girls',
      'feminine',
      'gal',
      'grandma',
      'grandmother',
      'granny',
      'mother',
      'mom',
      'mum',
      'aunt',
      'auntie',
      'queen',
      'princess',
      'actress',
      'she',
      'her',
    ],
  ],
  [
    'male',
    [
      'male',
      'man',
      'men',
      'guy',
      'guys',
      'boy',
      'boys',
      'masculine',
      'gentleman',
      'gentlemen',
      'dude',
      'grandpa',
      'grandfather',
      'father',
      'dad',
      'uncle',
      'king',
      'prince',
      'actor',
      'he',
      'him',
      'his',
    ],
  ],
];

const AGE_RULES: [string, string[]][] = [
  [
    'child',
    [
      'child',
      'children',
      'kid',
      'kiddo',
      'toddler',
      'little boy',
      'little girl',
      'young boy',
      'young girl',
      'small child',
      'childlike',
    ],
  ],
  ['teenager', ['teenager', 'teen', 'teenage', 'adolescent']],
  [
    'middle-aged',
    [
      'middle-aged',
      'middle aged',
      'middle age',
      'midlife',
      'forties',
      'fifties',
      'sixties',
      'mature',
    ],
  ],
  [
    'elderly',
    [
      'elderly',
      'old man',
      'old woman',
      'old lady',
      'older man',
      'older woman',
      'elder',
      'senior',
      'aged',
      'grandpa',
      'grandfather',
      'grandma',
      'grandmother',
      'granny',
      'retired',
      'seventies',
      'eighties',
      'nineties',
      'old',
    ],
  ],
  [
    'young adult',
    [
      'young adult',
      'young woman',
      'young man',
      'young lady',
      'youthful',
      'twenties',
      'thirties',
      'college',
      'young',
    ],
  ],
];

const PITCH_RULES: [string, string[]][] = [
  [
    'very low pitch',
    [
      'very low pitch',
      'very low-pitched',
      'very low pitched',
      'very low voice',
      'very low tone',
      'very deep',
      'extremely deep',
      'extremely low',
      'ultra deep',
      'booming',
      'gravelly',
    ],
  ],
  [
    'very high pitch',
    [
      'very high pitch',
      'very high-pitched',
      'very high pitched',
      'very high voice',
      'very high tone',
      'extremely high',
      'squeaky',
      'shrill',
      'falsetto',
      'chipmunk',
    ],
  ],
  [
    'low pitch',
    [
      'low pitch',
      'low-pitched',
      'low pitched',
      'low voice',
      'low tone',
      'low register',
      'deep',
      'deeper',
      'bass',
      'baritone',
      'husky',
      'warm',
    ],
  ],
  [
    'high pitch',
    [
      'high pitch',
      'high-pitched',
      'high pitched',
      'high voice',
      'high tone',
      'high register',
      'soprano',
      'bright',
    ],
  ],
  [
    'moderate pitch',
    [
      'moderate pitch',
      'medium pitch',
      'medium-pitched',
      'medium pitched',
      'mid-range',
      'midrange',
      'average pitch',
      'moderate',
    ],
  ],
];

const STYLE_RULES: [string, string[]][] = [
  [
    'whisper',
    [
      'whisper',
      'whispering',
      'whispered',
      'whispery',
      'hushed',
      'breathy',
      'soft-spoken',
      'soft spoken',
    ],
  ],
];

const ACCENT_RULES: [string, string[]][] = [
  [
    'american accent',
    ['american', 'america', 'usa', 'us accent', 'midwestern', 'californian', 'new york'],
  ],
  [
    'british accent',
    [
      'british',
      'britain',
      'english accent',
      'england',
      'uk accent',
      'london',
      'cockney',
      'posh',
      'received pronunciation',
    ],
  ],
  ['australian accent', ['australian', 'australia', 'aussie']],
  ['canadian accent', ['canadian', 'canada']],
  ['indian accent', ['indian', 'india']],
  ['chinese accent', ['chinese accent', 'chinese-accented']],
  ['korean accent', ['korean', 'korea']],
  ['japanese accent', ['japanese', 'japan']],
  ['portuguese accent', ['portuguese', 'portugal', 'brazilian', 'brazil']],
  ['russian accent', ['russian', 'russia']],
];

const DIALECT_RULES: [string, string[]][] = [
  ['四川话', ['sichuan', 'szechuan', '四川话']],
  ['东北话', ['dongbei', 'northeastern chinese', '东北话']],
  ['河南话', ['henan', '河南话']],
  ['陕西话', ['shaanxi', '陕西话']],
  ['贵州话', ['guizhou', '贵州话']],
  ['云南话', ['yunnan', '云南话']],
  ['桂林话', ['guilin', '桂林话']],
  ['济南话', ['jinan', '济南话']],
  ['青岛话', ['qingdao', '青岛话']],
];

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'with',
  'and',
  'or',
  'in',
  'of',
  'for',
  'to',
  'like',
  'who',
  'that',
  'is',
  'sounds',
  'sound',
  'voice',
  'speaker',
  'accent',
  'tone',
  'pitch',
  'speaking',
  'speaks',
]);

export function describeVoiceToAttributes(description: string): {
  attrs: VoiceDesignAttributes;
  instruct: string;
  matched: Record<string, string>;
  unmatched: string[];
} {
  const attrs: VoiceDesignAttributes = { ...DEFAULT_VD_STATES };
  const matched: Record<string, string> = {};
  const lower = description.toLowerCase();
  const matchedWords = new Set<string>();

  const matchCategory = (key: keyof VoiceDesignAttributes, rules: [string, string[]][]) => {
    for (const [canonical, phrases] of rules) {
      for (const phrase of phrases) {
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s\\-]+');
        const re = /[\u4e00-\u9fff]/.test(phrase)
          ? new RegExp(escaped, 'i')
          : new RegExp(`\\b${escaped}\\b`, 'i');
        const m = lower.match(re);
        if (m) {
          attrs[key] = canonical;
          matched[key] = m[0];
          m[0]
            .toLowerCase()
            .split(/[\s\-]+/)
            .forEach((w) => matchedWords.add(w));
          return;
        }
      }
    }
  };

  // Numeric age check e.g. "65 year old"
  const ageNumMatch = lower.match(/\b(\d{1,3})\s*(?:-\s*)?(?:years?\s*old|yo|yr)\b/);
  if (ageNumMatch) {
    const yrs = Number(ageNumMatch[1]);
    if (yrs <= 12) attrs.Age = 'child';
    else if (yrs <= 19) attrs.Age = 'teenager';
    else if (yrs <= 35) attrs.Age = 'young adult';
    else if (yrs <= 60) attrs.Age = 'middle-aged';
    else attrs.Age = 'elderly';
    matched.Age = ageNumMatch[0];
    ageNumMatch[0].split(/[\s\-]+/).forEach((w) => matchedWords.add(w));
  }

  matchCategory('Gender', GENDER_RULES);
  if (attrs.Age === 'Auto') matchCategory('Age', AGE_RULES);
  matchCategory('Pitch', PITCH_RULES);
  matchCategory('Style', STYLE_RULES);
  matchCategory('EnglishAccent', ACCENT_RULES);
  matchCategory('ChineseDialect', DIALECT_RULES);

  // Conflict resolution: EnglishAccent and ChineseDialect are mutually exclusive
  if (attrs.EnglishAccent !== 'Auto' && attrs.ChineseDialect !== 'Auto') {
    attrs.ChineseDialect = 'Auto';
  }

  const words = lower.match(/[a-z]{3,}/g) || [];
  const unmatched = Array.from(
    new Set(words.filter((w) => !STOPWORDS.has(w) && !matchedWords.has(w))),
  );

  return {
    attrs,
    instruct: buildInstructFromAttributes(attrs),
    matched,
    unmatched,
  };
}

export const USE_CASE_CATEGORIES = [
  { id: 'narration', name: 'Narration & Story', icon: 'BookOpen' },
  { id: 'conversational', name: 'Conversational', icon: 'MessagesSquare' },
  { id: 'characters', name: 'Characters & Animation', icon: 'Drama' },
  { id: 'social', name: 'Social Media', icon: 'Smartphone' },
  { id: 'entertainment', name: 'Entertainment & TV', icon: 'Tv' },
  { id: 'advertisement', name: 'Advertisement', icon: 'Megaphone' },
  { id: 'informative', name: 'Informative & Educational', icon: 'GraduationCap' },
] as const;

export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    id: 'narrator',
    name: 'Narrator',
    instruct: 'middle-aged, low pitch',
    description: 'Calm, authoritative documentary narrator with measured pacing',
    icon: 'BookOpen',
  },
  {
    id: 'casual',
    name: 'Casual',
    instruct: 'young adult, moderate pitch',
    description: 'Relaxed, conversational tone like talking to a friend',
    icon: 'Smile',
  },
  {
    id: 'news_anchor',
    name: 'News Anchor',
    instruct: 'middle-aged, moderate pitch, american accent',
    description: 'Clear, professional television news presenter',
    icon: 'Tv',
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    instruct: 'middle-aged, moderate pitch, british accent',
    description: 'Dramatic flair and engaging pacing like reading a bedtime story',
    icon: 'Wand2',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    instruct: 'middle-aged, moderate pitch',
    description: 'Polished, professional tone suitable for business presentations',
    icon: 'Briefcase',
  },
  {
    id: 'energetic',
    name: 'Energetic',
    instruct: 'young adult, high pitch',
    description: 'High energy and enthusiasm like a podcast host',
    icon: 'Zap',
  },
  // 7 Demo Preset Cards with real pre-rendered WAVs from /samples/voice_design/
  {
    id: 'audiobook_uk_narrator',
    name: 'The Librarian',
    icon: 'Library',
    description: 'Warm UK audiobook narrator — measured, atmospheric.',
    instruct: 'female, middle-aged, low pitch, british accent',
    attrs: {
      Gender: 'female',
      Age: 'middle-aged',
      Pitch: 'low pitch',
      Style: 'Auto',
      EnglishAccent: 'british accent',
      ChineseDialect: 'Auto',
    },
    script:
      'The clock tower struck thirteen, and for the first time in her life, Eleanor wondered if she had been counting wrong all along.',
    preview_url: '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
    language: 'English',
    is_demo: true,
  },
  {
    id: 'us_news_anchor',
    name: 'The Anchor',
    icon: 'Tv',
    description: 'Clear American broadcaster — primetime evening news.',
    instruct: 'male, middle-aged, moderate pitch, american accent',
    attrs: {
      Gender: 'male',
      Age: 'middle-aged',
      Pitch: 'moderate pitch',
      Style: 'Auto',
      EnglishAccent: 'american accent',
      ChineseDialect: 'Auto',
    },
    script:
      'Good evening. Topping our broadcast tonight: scientists at the coastal observatory have confirmed the signal is, in fact, repeating.',
    preview_url: '/samples/voice_design/demo_voice_design_us_news_anchor.wav',
    language: 'English',
    is_demo: true,
  },
  {
    id: 'indian_support_agent',
    name: 'The Helpdesk',
    icon: 'Headphones',
    description: 'Patient Indian-English customer-service voice.',
    instruct: 'female, young adult, moderate pitch, indian accent',
    attrs: {
      Gender: 'female',
      Age: 'young adult',
      Pitch: 'moderate pitch',
      Style: 'Auto',
      EnglishAccent: 'indian accent',
      ChineseDialect: 'Auto',
    },
    script:
      "Thank you for calling VoiceStudio support. I can see your account here. Let's get this sorted out together.",
    preview_url: '/samples/voice_design/demo_voice_design_indian_support_agent.wav',
    language: 'English',
    is_demo: true,
  },
  {
    id: 'gravelly_villain',
    name: 'Captain Crusty',
    icon: 'Skull',
    description: 'Gravelly old sailor — cartoon villain energy, original character.',
    instruct: 'male, elderly, very low pitch',
    attrs: {
      Gender: 'male',
      Age: 'elderly',
      Pitch: 'very low pitch',
      Style: 'Auto',
      EnglishAccent: 'Auto',
      ChineseDialect: 'Auto',
    },
    script:
      'You came a long way for an answer you already had. Sit. The fire is warm, and the truth is not.',
    preview_url: '/samples/voice_design/demo_voice_design_gravelly_villain.wav',
    language: 'English',
    is_demo: true,
  },
  {
    id: 'aussie_podcaster',
    name: 'The Podcaster',
    icon: 'Radio',
    description: 'Aussie explainer-show host — quick, punchy, friendly.',
    instruct: 'female, young adult, high pitch, australian accent',
    attrs: {
      Gender: 'female',
      Age: 'young adult',
      Pitch: 'high pitch',
      Style: 'Auto',
      EnglishAccent: 'australian accent',
      ChineseDialect: 'Auto',
    },
    script:
      "Right, so here's the wild bit. Nobody told the engineers the satellite was supposed to be in orbit by Tuesday. Tuesday came and went.",
    preview_url: '/samples/voice_design/demo_voice_design_aussie_podcaster.wav',
    language: 'English',
    is_demo: true,
  },
  {
    id: 'bedtime_storyteller',
    name: 'Junior Quacks',
    icon: 'Bird',
    description: 'Anxious squawky sidekick — cartoon nephew energy, original character.',
    instruct: 'young adult, high pitch',
    attrs: {
      Gender: 'Auto',
      Age: 'young adult',
      Pitch: 'high pitch',
      Style: 'Auto',
      EnglishAccent: 'Auto',
      ChineseDialect: 'Auto',
    },
    script:
      'Once, in a town where every street was named after a kind of bread, a small fox decided she was going to learn to play the cello.',
    preview_url: '/samples/voice_design/demo_voice_design_bedtime_storyteller.wav',
    language: 'English',
    is_demo: true,
  },
  {
    id: 'mandarin_sichuan',
    name: 'The Sichuan Friend',
    icon: 'Flame',
    description: '四川话 — non-English showcase, dialect-aware design.',
    instruct: 'female, young adult, moderate pitch, 四川话',
    attrs: {
      Gender: 'female',
      Age: 'young adult',
      Pitch: 'moderate pitch',
      Style: 'Auto',
      EnglishAccent: 'Auto',
      ChineseDialect: '四川话',
    },
    script: '今天天气巴适得很，我们去吃火锅嘛！记得多加点豆芽。',
    preview_url: '/samples/voice_design/demo_voice_design_mandarin_sichuan.wav',
    language: 'Chinese',
    is_demo: true,
  },
];

const SAMPLE_SCRIPTS: Record<string, string> = {
  narration:
    'The valley had been quiet for a hundred years, and tonight, for the first time, something stirred beneath the old stone bridge.',
  conversational:
    "Oh hey, I didn't expect to run into you here! How have you been? We should really catch up properly one of these days.",
  characters:
    'You think you can stop me? Ha! I have crossed oceans of time and bent whole kingdoms to my will.',
  social:
    'What is up, everyone, welcome back to the channel! Today we are trying something I have honestly never done before.',
  entertainment:
    "Good evening, and welcome. Tonight's top story is one you will not want to miss, so stay right there — we'll be back after this.",
  advertisement:
    'Introducing a whole new way to get more done in less time. Available today. Your best work starts right now.',
  informative:
    "Let's break this down simply. There are three things you need to know, and the very first one surprises most people.",
};

type FeaturedSpecTuple = [
  string | null,
  string,
  string,
  string | null,
  boolean,
  string,
  string,
  string,
  string | null,
];

const FEATURED_SPECS: FeaturedSpecTuple[] = [
  [
    'female',
    'middle-aged',
    'low pitch',
    'british accent',
    false,
    'narration',
    'The Librarian',
    'Library',
    '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
  ],
  [
    'male',
    'middle-aged',
    'low pitch',
    'american accent',
    false,
    'narration',
    'The Documentarian',
    'Mic',
    null,
  ],
  ['female', 'middle-aged', 'low pitch', null, true, 'narration', 'The Calm Guide', 'Moon', null],
  [
    'male',
    'elderly',
    'low pitch',
    'british accent',
    false,
    'narration',
    'The Storyteller',
    'Wand2',
    null,
  ],
  [
    'female',
    'young adult',
    'moderate pitch',
    'american accent',
    false,
    'conversational',
    'The Neighbor',
    'Smile',
    null,
  ],
  [
    'female',
    'young adult',
    'moderate pitch',
    'indian accent',
    false,
    'conversational',
    'The Helpdesk',
    'Headphones',
    '/samples/voice_design/demo_voice_design_indian_support_agent.wav',
  ],
  [
    'male',
    'young adult',
    'moderate pitch',
    'australian accent',
    false,
    'conversational',
    'The Mate',
    'MessageSquare',
    null,
  ],
  [
    'female',
    'middle-aged',
    'moderate pitch',
    'canadian accent',
    false,
    'conversational',
    'The Companion',
    'Coffee',
    null,
  ],
  [
    'male',
    'elderly',
    'very low pitch',
    null,
    false,
    'characters',
    'Captain Crusty',
    'Skull',
    '/samples/voice_design/demo_voice_design_gravelly_villain.wav',
  ],
  [
    null,
    'teenager',
    'high pitch',
    null,
    false,
    'characters',
    'Junior Quacks',
    'Bird',
    '/samples/voice_design/demo_voice_design_bedtime_storyteller.wav',
  ],
  [
    'male',
    'young adult',
    'high pitch',
    'american accent',
    false,
    'characters',
    'The Champion',
    'Shield',
    null,
  ],
  ['female', 'child', 'very high pitch', null, false, 'characters', 'The Pixie', 'Sparkles', null],
  ['male', 'middle-aged', 'very low pitch', null, false, 'characters', 'The Ogre', 'Ghost', null],
  [
    'female',
    'young adult',
    'high pitch',
    'australian accent',
    false,
    'social',
    'The Podcaster',
    'Radio',
    '/samples/voice_design/demo_voice_design_aussie_podcaster.wav',
  ],
  [
    'male',
    'young adult',
    'very high pitch',
    'american accent',
    false,
    'social',
    'The Hype Host',
    'Zap',
    null,
  ],
  ['female', 'young adult', 'high pitch', null, false, 'social', 'The Vlogger', 'Video', null],
  [
    'male',
    'middle-aged',
    'moderate pitch',
    'american accent',
    false,
    'entertainment',
    'The Anchor',
    'Tv',
    '/samples/voice_design/demo_voice_design_us_news_anchor.wav',
  ],
  [
    'male',
    'middle-aged',
    'high pitch',
    'british accent',
    false,
    'entertainment',
    'The Commentator',
    'Trophy',
    null,
  ],
  [
    'male',
    'middle-aged',
    'moderate pitch',
    null,
    false,
    'entertainment',
    'The Game Host',
    'Clapperboard',
    null,
  ],
  [
    'male',
    'middle-aged',
    'low pitch',
    null,
    false,
    'advertisement',
    'The Promo Voice',
    'Megaphone',
    null,
  ],
  [
    'female',
    'middle-aged',
    'moderate pitch',
    'british accent',
    false,
    'advertisement',
    'The Luxe',
    'Gem',
    null,
  ],
  [
    'female',
    'young adult',
    'high pitch',
    'american accent',
    false,
    'advertisement',
    'The Upbeat',
    'Music',
    null,
  ],
  [
    'female',
    'middle-aged',
    'moderate pitch',
    'american accent',
    false,
    'informative',
    'The Teacher',
    'GraduationCap',
    null,
  ],
  [
    'male',
    'young adult',
    'moderate pitch',
    'british accent',
    false,
    'informative',
    'The Explainer',
    'Lightbulb',
    null,
  ],
];

const MULTILINGUAL_SAMPLES: Record<string, string> = {
  Urdu:
    'السلام علیکم اور وائس اسٹوڈیو کے اس مختصر صوتی ڈیمو میں خوش آمدید۔ امید ہے آپ کو یہ آواز پسند آئے گی۔',
  Spanish:
    'Hola y bienvenido a esta breve demostración de voz. Espero que disfrutes escuchando cómo suena.',
  French:
    "Bonjour et bienvenue dans cette courte démonstration vocale. J'espère que cette voix vous plaira.",
  German:
    'Hallo und willkommen zu dieser kurzen Sprachdemo. Ich hoffe, diese Stimme gefällt dir.',
  Italian:
    'Ciao e benvenuto in questa breve dimostrazione vocale. Spero che questa voce ti piaccia.',
  Portuguese:
    'Olá e bem-vindo a esta breve demonstração de voz. Espero que goste de ouvir como ela soa.',
  Russian:
    'Здравствуйте и добро пожаловать в эту короткую демонстрацию голоса. Надеюсь, вам понравится, как он звучит.',
  Hindi:
    'नमस्ते और इस छोटे से वॉइस डेमो में आपका स्वागत है। मुझे आशा है कि आपको यह आवाज़ पसंद आएगी।',
  Japanese:
    'こんにちは。この短い音声デモへようこそ。この声を気に入っていただけるとうれしいです。',
  Korean:
    '안녕하세요. 이 짧은 음성 데모에 오신 것을 환영합니다. 이 목소리가 마음에 드시길 바랍니다.',
};

function buildArchetypesCatalog(): ArchetypeItem[] {
  const list: ArchetypeItem[] = [];

  FEATURED_SPECS.forEach(([gender, age, pitch, accent, whisper, uc, name, icon, previewUrl], idx) => {
    const toks = [gender, age, pitch, whisper ? 'whisper' : null, accent].filter(
      Boolean,
    ) as string[];
    const slug = name.toLowerCase().replace(/\s+/g, '_');
    list.push({
      id: `feat_${String(idx).padStart(2, '0')}_${slug}`,
      name,
      icon,
      use_case: uc,
      instruct: toks.join(', '),
      attrs: {
        Gender: gender || 'Auto',
        Age: age || 'Auto',
        Pitch: pitch || 'Auto',
        Style: whisper ? 'whisper' : 'Auto',
        EnglishAccent: accent || 'Auto',
        ChineseDialect: 'Auto',
      },
      facets: {
        gender,
        age,
        pitch,
        accent,
        whisper,
        lang: 'English',
      },
      sample_script: SAMPLE_SCRIPTS[uc] || SAMPLE_SCRIPTS.narration,
      preview_url: previewUrl,
      is_featured: true,
      language: 'English',
    });
  });

  // Multilingual featured
  const mlRoles: [string, string, string, string, string, string][] = [
    ['female', 'middle-aged', 'low pitch', 'narration', 'Narrator', 'BookOpen'],
    ['male', 'young adult', 'moderate pitch', 'informative', 'Explainer', 'GraduationCap'],
    ['female', 'young adult', 'moderate pitch', 'conversational', 'Companion', 'MessagesSquare'],
  ];

  for (const [language, script] of Object.entries(MULTILINGUAL_SAMPLES)) {
    for (const [gender, age, pitch, uc, role, icon] of mlRoles) {
      const instruct = [gender, age, pitch].join(', ');
      list.push({
        id: `ml_${language.toLowerCase()}_${role.toLowerCase()}`,
        name: `${language} ${role}`,
        icon,
        use_case: uc,
        instruct,
        attrs: {
          Gender: gender,
          Age: age,
          Pitch: pitch,
          Style: 'Auto',
          EnglishAccent: 'Auto',
          ChineseDialect: 'Auto',
        },
        facets: {
          gender,
          age,
          pitch,
          accent: null,
          whisper: false,
          lang: language,
        },
        sample_script: script,
        preview_url: null,
        is_featured: true,
        language,
      });
    }
  }

  // Generated combinatorial archetypes (pruned of implausible combinations)
  const genders = ['female', 'male'];
  const ages = ['child', 'teenager', 'young adult', 'middle-aged', 'elderly'];
  const pitches = ['very low pitch', 'low pitch', 'moderate pitch', 'high pitch', 'very high pitch'];
  const accents = [
    'american accent',
    'british accent',
    'australian accent',
    'canadian accent',
    'indian accent',
    'japanese accent',
    'korean accent',
    'portuguese accent',
    'russian accent',
  ];

  let genIdx = 0;
  for (const gender of genders) {
    for (const age of ages) {
      for (const pitch of pitches) {
        if (age === 'child' && (pitch === 'very low pitch' || pitch === 'low pitch')) continue;
        if (age === 'teenager' && pitch === 'very low pitch') continue;
        if (age === 'elderly' && pitch === 'very high pitch') continue;

        for (const accent of accents) {
          const instruct = `${gender}, ${age}, ${pitch}, ${accent}`;
          const uc =
            age === 'child' || age === 'teenager'
              ? 'characters'
              : pitch === 'low pitch' && age === 'middle-aged'
                ? 'narration'
                : age === 'young adult' && pitch === 'high pitch'
                  ? 'social'
                  : 'conversational';
          const accentTitle = accent.replace(' accent', '');
          const name = `${accentTitle.charAt(0).toUpperCase() + accentTitle.slice(1)} · ${
            gender.charAt(0).toUpperCase() + gender.slice(1)
          } · ${age.charAt(0).toUpperCase() + age.slice(1)} · ${pitch.replace(' pitch', '')}`;
          list.push({
            id: `gen_${genIdx++}`,
            name,
            icon: 'AudioLines',
            use_case: uc,
            instruct,
            attrs: {
              Gender: gender,
              Age: age,
              Pitch: pitch,
              Style: 'Auto',
              EnglishAccent: accent,
              ChineseDialect: 'Auto',
            },
            facets: {
              gender,
              age,
              pitch,
              accent,
              whisper: false,
              lang: 'English',
            },
            sample_script: SAMPLE_SCRIPTS[uc] || SAMPLE_SCRIPTS.narration,
            preview_url: null,
            is_featured: false,
            language: 'English',
          });
        }
      }
    }
  }

  return list;
}

export const ARCHETYPE_CATALOG: ArchetypeItem[] = buildArchetypesCatalog();

export const SUPPORTED_LANGUAGES = [
  'Auto',
  'English',
  'Urdu',
  'Spanish',
  'French',
  'German',
  'Chinese',
  'Japanese',
  'Korean',
  'Portuguese',
  'Italian',
  'Russian',
  'Hindi',
  'Arabic',
  'Persian',
  'Bengali',
  'Dutch',
  'Turkish',
  'Polish',
  'Swedish',
  'Vietnamese',
  'Indonesian',
  'Ukrainian',
  'Greek',
  'Czech',
  'Romanian',
  'Danish',
  'Finnish',
  'Hungarian',
  'Norwegian',
  'Thai',
  'Swahili',
  'Tagalog',
  'Tamil',
  'Telugu',
  'Malay',
];

export const INITIAL_VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'clone_babar_azam',
    name: 'Babar Azam (Your Uploaded Sample · اردو / EN)',
    kind: 'clone',
    language: 'Urdu',
    ref_text:
      'دیکھیں میرے خیال سے رسپانسبلٹی پوری جو ہے وہ الیون اے سائیڈ کی ہوتی ہے، یہ نہیں کہ بولرز اگر کریں گے بیس آؤٹ تو بیٹسمینوں کا بھی رسپانسبلٹی ہے کہ وہ رنز کریں۔',
    instruct: 'male, young adult, moderate pitch, calm pakistani urdu-english press conference cadence',
    personality: 'casual',
    audio_url: '/assets/aistudio/babar-voice-sample_74691ef6.wav',
    starred: true,
    created_at: '2026-10-26T10:00:00Z',
  },
  {
    id: 'demo_clone',
    name: 'Studio Reference (Bundled Clone)',
    kind: 'clone',
    language: 'English',
    ref_text:
      'VoiceStudio runs locally on your machine for high-precision zero-shot voice cloning and video dubbing.',
    instruct: 'middle-aged, moderate pitch, american accent',
    personality: 'narrator',
    audio_url: '/samples/demo_voice.wav',
    starred: true,
    locked: true,
    created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: 'feat_urdu_narrator',
    name: 'Dastaan (Urdu Narrator · اردو)',
    kind: 'design',
    language: 'Urdu',
    ref_text:
      'السلام علیکم! وائس اسٹوڈیو میں خوش آمدید۔ آپ یہاں اردو میں بھی آواز کلون اور ڈیزائن کر سکتے ہیں۔',
    instruct: 'male, middle-aged, moderate pitch',
    seed: 55,
    vd_states: {
      Gender: 'male',
      Age: 'middle-aged',
      Pitch: 'moderate pitch',
      Style: 'Auto',
      EnglishAccent: 'Auto',
      ChineseDialect: 'Auto',
    },
    audio_url: '/samples/demo_voice.wav',
    starred: true,
    created_at: '2026-10-16T11:00:00Z',
  },
  {
    id: 'feat_librarian',
    name: 'The Librarian',
    kind: 'design',
    language: 'English',
    ref_text:
      'The clock tower struck thirteen, and for the first time in her life, Eleanor wondered if she had been counting wrong all along.',
    instruct: 'female, middle-aged, low pitch, british accent',
    seed: 42,
    vd_states: {
      Gender: 'female',
      Age: 'middle-aged',
      Pitch: 'low pitch',
      Style: 'Auto',
      EnglishAccent: 'british accent',
      ChineseDialect: 'Auto',
    },
    audio_url: '/samples/voice_design/demo_voice_design_audiobook_uk_narrator.wav',
    starred: true,
    created_at: '2026-10-16T14:20:00Z',
  },
  {
    id: 'feat_anchor',
    name: 'The Anchor',
    kind: 'design',
    language: 'English',
    ref_text:
      'Good evening. Topping our broadcast tonight: scientists at the coastal observatory have confirmed the signal is, in fact, repeating.',
    instruct: 'male, middle-aged, moderate pitch, american accent',
    seed: 42,
    vd_states: {
      Gender: 'male',
      Age: 'middle-aged',
      Pitch: 'moderate pitch',
      Style: 'Auto',
      EnglishAccent: 'american accent',
      ChineseDialect: 'Auto',
    },
    audio_url: '/samples/voice_design/demo_voice_design_us_news_anchor.wav',
    starred: false,
    created_at: '2026-10-17T09:15:00Z',
  },
  {
    id: 'feat_podcaster',
    name: 'The Podcaster',
    kind: 'design',
    language: 'English',
    ref_text:
      "Right, so here's the wild bit. Nobody told the engineers the satellite was supposed to be in orbit by Tuesday.",
    instruct: 'female, young adult, high pitch, australian accent',
    seed: 108,
    vd_states: {
      Gender: 'female',
      Age: 'young adult',
      Pitch: 'high pitch',
      Style: 'Auto',
      EnglishAccent: 'australian accent',
      ChineseDialect: 'Auto',
    },
    audio_url: '/samples/voice_design/demo_voice_design_aussie_podcaster.wav',
    starred: true,
    created_at: '2026-10-18T11:30:00Z',
  },
  {
    id: 'feat_crusty',
    name: 'Captain Crusty',
    kind: 'design',
    language: 'English',
    ref_text:
      'You came a long way for an answer you already had. Sit. The fire is warm, and the truth is not.',
    instruct: 'male, elderly, very low pitch',
    seed: 77,
    vd_states: {
      Gender: 'male',
      Age: 'elderly',
      Pitch: 'very low pitch',
      Style: 'Auto',
      EnglishAccent: 'Auto',
      ChineseDialect: 'Auto',
    },
    audio_url: '/samples/voice_design/demo_voice_design_gravelly_villain.wav',
    starred: false,
    created_at: '2026-10-19T16:45:00Z',
  },
];

export const INITIAL_MODEL_CATALOG: ModelCatalogItem[] = [
  {
    repo_id: 'k2-fsa/OmniVoice',
    label: 'VoiceStudio TTS (k2-fsa/OmniVoice, 600+ languages, zero-shot)',
    role: 'TTS',
    engines: ['omnivoice', 'omnivoice-subprocess'],
    size_gb: 2.4,
    required: true,
    installed: true,
    curated_on: ['all'],
    license: 'Apache-2.0',
    note: 'Default zero-shot voice cloning & voice design engine across 646 languages.',
  },
  {
    repo_id: 'FunAudioLLM/CosyVoice-300M',
    label: 'CosyVoice 3 (GGUF + Vulkan / PyTorch zero-shot TTS)',
    role: 'TTS',
    engines: ['cosyvoice', 'cosyvoice-gguf'],
    size_gb: 1.8,
    installed: true,
    curated_on: ['cuda', 'rocm'],
    license: 'Apache-2.0',
    note: 'Expressive multilingual speech synthesis with native GGUF Vulkan support.',
  },
  {
    repo_id: 'IndexTeam/IndexTTS-2.5',
    label: 'IndexTTS 2.5 (Fast expressive zero-shot cloning)',
    role: 'TTS',
    engines: ['indextts'],
    size_gb: 2.1,
    installed: false,
    license: 'MIT',
    note: 'High-clarity zero-shot voice cloning with prosody control.',
  },
  {
    repo_id: 'audio-cpp/audio.cpp-gguf',
    label: 'audio.cpp native bundle (Breeze-TTS-2 + Sortformer diarisation)',
    role: 'TTS',
    engines: ['audiocpp'],
    size_gb: 4.98,
    installed: false,
    license: 'Research / Non-Commercial',
    note: 'Optional audio.cpp bundle for native voice cloning and up-to-four-speaker diarisation.',
  },
  {
    repo_id: 'Systran/faster-whisper-large-v3',
    label: 'Whisper large-v3 (faster-whisper — cross-platform, 99 langs)',
    role: 'ASR',
    engines: ['faster-whisper', 'whisperx'],
    size_gb: 2.9,
    installed: true,
    curated_on: ['cuda', 'rocm', 'cpu'],
    license: 'MIT',
    note: 'Best word-timestamp robustness for dubbing and reference transcription.',
  },
  {
    repo_id: 'csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8',
    label: 'Parakeet TDT v3 (sherpa-onnx — live dictation, 25 EU langs)',
    role: 'ASR',
    engines: ['sherpa-onnx-asr'],
    size_gb: 0.67,
    installed: true,
    curated_on: ['all'],
    license: 'CC-BY-4.0',
    note: 'Faster-than-real-time CPU int8 ONNX dictation model.',
  },
  {
    repo_id: 'facebook/nllb-200-distilled-600M',
    label: 'NLLB-200 Distilled 600M (Local neural machine translation, 200 langs)',
    role: 'Translation',
    engines: ['nllb'],
    size_gb: 1.2,
    installed: true,
    curated_on: ['all'],
    license: 'CC-BY-NC-4.0',
    note: 'Local offline translation engine for video dubbing and subtitle localization.',
  },
  {
    repo_id: 'pyannote/speaker-diarization-3.1',
    label: 'Speaker Diarization 3.1 (Multi-speaker segmentation)',
    role: 'Diarisation',
    engines: ['pyannote'],
    size_gb: 0.45,
    installed: true,
    license: 'MIT',
    note: 'Identifies individual speakers in multi-speaker dubbing & transcription tracks.',
  },
];

export const DUBBING_DEMO_MANIFEST = {
  version: '0.3.0',
  source: {
    code: 'en',
    label: 'English',
    video: '/samples/demo/dubbing/source.mp4',
    srt: '/samples/demo/dubbing/source.srt',
    script:
      'VoiceStudio is a desktop app for voice cloning, video dubbing, and voice design. It runs entirely on your machine. No accounts, no cloud, no API keys. Just open the app and start creating.',
  },
  dubbed: [
    {
      code: 'es',
      label: 'Español',
      video: '/samples/demo/dubbing/dubbed_es.mp4',
      srt: '/samples/demo/dubbing/dubbed_es.srt',
      script:
        'VoiceStudio es una aplicación de escritorio para clonación de voz, doblaje de vídeo y diseño de voz. Funciona completamente en tu máquina. Sin cuentas, sin nube, sin claves de API. Solo abre la aplicación y comienza a crear.',
    },
    {
      code: 'fr',
      label: 'Français',
      video: '/samples/demo/dubbing/dubbed_fr.mp4',
      srt: '/samples/demo/dubbing/dubbed_fr.srt',
      script:
        "VoiceStudio est une application de bureau pour le clonage de voix, le doublage vidéo et la conception vocale. Elle fonctionne entièrement sur votre machine. Pas de compte, pas de cloud, pas de clé d'API. Ouvrez l'application et commencez à créer.",
    },
    {
      code: 'zh',
      label: '中文',
      video: '/samples/demo/dubbing/dubbed_zh.mp4',
      srt: '/samples/demo/dubbing/dubbed_zh.srt',
      script:
        'VoiceStudio 是一款桌面应用，用于语音克隆、视频配音和声音设计。它完全在你的电脑上运行。无需账户，无需云端，无需 API 密钥。打开应用即可开始创作。',
    },
    {
      code: 'ja',
      label: '日本語',
      video: '/samples/demo/dubbing/dubbed_ja.mp4',
      srt: '/samples/demo/dubbing/dubbed_ja.srt',
      script:
        'VoiceStudioは、ボイスクローン、ビデオ吹き替え、ボイスデザインのためのデスクトップアプリです。すべてお使いのコンピュータ上で動作します。アカウント、クラウド、APIキーは不要です。アプリを開けば、すぐに制作を始められます。',
    },
  ],
};

/**
 * Deterministic local dictation text cleanup ported from backend/services/dictation_cleanup.py
 */
export function cleanDictatedText(
  raw: string,
  options: { removeFillers: boolean; spokenPunctuation: boolean } = {
    removeFillers: true,
    spokenPunctuation: false,
  },
): string {
  let text = raw.trim();
  if (!text) return '';

  if (options.removeFillers) {
    // Remove common hesitations ("uh", "umm", "um", "er")
    text = text.replace(/\b(uh+|um+|er+|ah+)\b[,]?\s*/gi, '');
    // Remove stutters on short words ("the the", "I I", "to to")
    text = text.replace(/\b(\w{1,3})\s+\1\b/gi, '$1');
  }

  if (options.spokenPunctuation) {
    text = text
      .replace(/\s*\bcomma\b/gi, ',')
      .replace(/\s*\b(period|full stop)\b/gi, '.')
      .replace(/\s*\bquestion mark\b/gi, '?')
      .replace(/\s*\bexclamation mark\b/gi, '!')
      .replace(/\s*\bcolon\b/gi, ':')
      .replace(/\s*\bsemicolon\b/gi, ';')
      .replace(/\s*\bnew line\b\s*/gi, '\n')
      .replace(/\s*\bnew paragraph\b\s*/gi, '\n\n');
  }

  // Fix standalone lowercase 'i'
  text = text.replace(/\bi\b/g, 'I');
  // Drop stray spaces before punctuation
  text = text.replace(/\s+([,.!?;:])/g, '$1');
  // Sentence-case start of sentences
  text = text.replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (m) => m.toUpperCase());

  return text.trim();
}
