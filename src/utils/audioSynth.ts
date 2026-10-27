/**
 * Real Web Audio API WAV generator + Browser Web Speech API (speechSynthesis) engine
 * for local-first synthesis & preview playback.
 */

export function computeDeterministicPeaks(seedText: string, count = 48): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    hash ^= i * 374761393;
    hash = Math.imul(hash, 668265263);
    const normalized = ((hash >>> 0) % 1000) / 1000;
    const envelope = Math.sin((i / Math.max(1, count - 1)) * Math.PI);
    peaks.push(Math.max(0.12, Math.min(0.98, 0.2 + normalized * 0.65 * (0.4 + 0.6 * envelope))));
  }
  return peaks;
}

export interface SynthVoiceParams {
  text: string;
  instruct?: string;
  speed?: number;
  seed?: number;
}

export function synthesizeSpeechWav({
  text,
  instruct = '',
  speed = 1.0,
  seed = 42,
}: SynthVoiceParams): { audioUrl: string; durationSec: number; peaks: number[] } {
  const sampleRate = 24000;
  const cleanText = text.trim() || 'VoiceStudio local synthesis sample.';
  const words = cleanText.split(/\s+/).filter(Boolean);
  const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
  const rawDuration = Math.max(1.8, Math.min(14.0, (words.length * 0.34) / clampedSpeed));
  const numSamples = Math.floor(sampleRate * rawDuration);

  const lowerInstruct = instruct.toLowerCase();
  const isFemale = lowerInstruct.includes('female');
  const isChild = lowerInstruct.includes('child') || lowerInstruct.includes('teenager');
  const isElderly = lowerInstruct.includes('elderly');
  const isVeryLow = lowerInstruct.includes('very low pitch');
  const isLow = !isVeryLow && lowerInstruct.includes('low pitch');
  const isVeryHigh = lowerInstruct.includes('very high pitch');
  const isHigh = !isVeryHigh && lowerInstruct.includes('high pitch');
  const isWhisper = lowerInstruct.includes('whisper');

  let baseF0 = isFemale ? 205 : 122;
  if (isChild) baseF0 = 265;
  if (isElderly) baseF0 *= 0.9;
  if (isVeryLow) baseF0 *= 0.72;
  else if (isLow) baseF0 *= 0.85;
  else if (isVeryHigh) baseF0 *= 1.35;
  else if (isHigh) baseF0 *= 1.18;

  baseF0 += ((seed % 19) - 9) * 1.4;

  const samples = new Float32Array(numSamples);
  let phase0 = 0;
  let phase1 = 0;
  let phase2 = 0;
  let noiseState = (seed || 42) >>> 0;

  const syllableRate = 3.8 * clampedSpeed;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const syllablePhase = t * syllableRate;
    const wordPause = Math.sin(t * 1.45 * Math.PI) > -0.68 ? 1 : 0.08;
    const syllableEnv = Math.max(0, Math.sin(syllablePhase * Math.PI)) ** 0.55 * wordPause;

    const fadeIn = Math.min(1, t / 0.06);
    const fadeOut = Math.min(1, (rawDuration - t) / 0.12);
    const amp = syllableEnv * fadeIn * fadeOut * 0.45;

    const f0 =
      baseF0 *
      (1 +
        0.06 * Math.sin(2 * Math.PI * 1.2 * t) +
        0.03 * Math.cos(2 * Math.PI * 2.7 * t) -
        0.08 * (t / rawDuration));

    const f1 = isFemale ? 540 : 460;
    const f2 = isFemale ? 1680 : 1420;

    phase0 += (2 * Math.PI * f0) / sampleRate;
    phase1 += (2 * Math.PI * f1) / sampleRate;
    phase2 += (2 * Math.PI * f2) / sampleRate;

    noiseState = (Math.imul(1664525, noiseState) + 1013904223) >>> 0;
    const whiteNoise = (noiseState / 0xffffffff) * 2 - 1;

    if (isWhisper) {
      const whisperSignal =
        whiteNoise * 0.55 * (0.5 + 0.5 * Math.sin(phase1)) + 0.12 * Math.sin(phase2);
      samples[i] = whisperSignal * amp;
    } else {
      const glottal =
        0.52 * Math.sin(phase0) +
        0.26 * Math.sin(2 * phase0 + 0.3) +
        0.14 * Math.sin(phase1) +
        0.07 * Math.sin(phase2) +
        0.03 * whiteNoise;
      samples[i] = glottal * amp;
    }
  }

  const wavBuffer = encodeWavFromFloat32(samples, sampleRate);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(blob);
  const peaks = computeDeterministicPeaks(`${cleanText}|${instruct}|${seed}`, 48);

  return {
    audioUrl,
    durationSec: Number(rawDuration.toFixed(1)),
    peaks,
  };
}

const neuralAudioCache = new Map<
  string,
  { audioUrl: string; durationSec: number; peaks: number[]; engineLabel?: string }
>();

const CLIENT_OMNIVOICE_HOSTS = [
  'https://k2-fsa-omnivoice.hf.space',
  'https://archivartaunik-omnivoice.hf.space',
  'https://nitrox-omnivoice.hf.space',
  'https://oddadmix-lahgtna-omnivoice-demo.hf.space',
  'https://d3vshoaib-omnivoice.hf.space',
  'https://ksrgszk-omnivoice.hf.space',
];

export const BABAR_CLEAN_REF_TRANSCRIPT =
  'آپ کو اچھی پارٹنرشپ کرنی پڑتی ہے، اچھی پارٹنرشپ میں بولنگ کرنی پڑتی ہے، اس پارٹنرشپ کو جو ہے وہ لانگ لے کے جانا پڑتا ہے';

let cachedBabarRefBlob: Blob | null = null;

async function resolveClientReferenceBlob(params: {
  profileName?: string;
  refAudioUrl?: string;
  refAudioBase64?: string;
  refText?: string;
}): Promise<{ blob: Blob; refText: string } | null> {
  const isBabar =
    (params.profileName || '').toLowerCase().includes('babar') ||
    (params.refAudioUrl || '').includes('babar');

  if (params.refAudioBase64 && params.refAudioBase64.startsWith('data:audio/')) {
    try {
      const trimResp = await fetch('/api/reference/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: params.refAudioBase64 }),
      });
      if (trimResp.ok) {
        const { audioDataUrl } = await trimResp.json();
        const blobResp = await fetch(audioDataUrl);
        const blob = await blobResp.blob();
        return {
          blob,
          refText: params.refText || BABAR_CLEAN_REF_TRANSCRIPT,
        };
      }
    } catch {}
    try {
      const blobResp = await fetch(params.refAudioBase64);
      const blob = await blobResp.blob();
      return {
        blob,
        refText: params.refText || BABAR_CLEAN_REF_TRANSCRIPT,
      };
    } catch {}
  }

  if (isBabar || !params.refAudioUrl || params.refAudioUrl.startsWith('/assets/aistudio/')) {
    try {
      if (!cachedBabarRefBlob) {
        const resp = await fetch('/api/reference/babar-clean.wav');
        if (resp.ok) {
          cachedBabarRefBlob = await resp.blob();
        }
      }
      if (cachedBabarRefBlob) {
        return {
          blob: cachedBabarRefBlob,
          refText: BABAR_CLEAN_REF_TRANSCRIPT,
        };
      }
    } catch {}
  }

  if (params.refAudioUrl) {
    try {
      const resp = await fetch(params.refAudioUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        return {
          blob,
          refText: params.refText || '',
        };
      }
    } catch {}
  }

  return null;
}

async function cloneClientSideWithOmniVoice(params: {
  text: string;
  language?: string;
  profileName?: string;
  refText?: string;
  refAudioUrl?: string;
  refAudioBase64?: string;
  steps?: number;
  guidance?: number;
  speed?: number;
  hfToken?: string;
}): Promise<{ audioUrl: string; durationSec: number } | null> {
  const refData = await resolveClientReferenceBlob(params);
  if (!refData) return null;

  const langArg =
    params.language && params.language !== 'Auto' ? params.language : 'Auto';
  const storedToken =
    params.hfToken ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('voicestudio.hf_token') || '' : '');
  const authHeaders: Record<string, string> = {};
  if (storedToken && storedToken.trim().startsWith('hf_')) {
    authHeaders['Authorization'] = `Bearer ${storedToken.trim()}`;
  }

  for (const host of CLIENT_OMNIVOICE_HOSTS) {
    try {
      const formData = new FormData();
      formData.append('files', refData.blob, 'reference-clean-8s.wav');

      const uploadResp = await fetch(`${host}/gradio_api/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      if (!uploadResp.ok) continue;
      const uploaded = (await uploadResp.json()) as string[];
      const remotePath = uploaded?.[0];
      if (!remotePath) continue;

      // Pass instruct = "" (empty string) during zero-shot cloning so OmniVoice
      // conditions 100% on the reference voice's acoustic tokens (voice_clone_prompt)
      const callPayload = {
        data: [
          params.text.trim(),
          langArg,
          { path: remotePath, meta: { _type: 'gradio.FileData' } },
          refData.refText || '',
          '',
          Math.min(32, Math.max(16, params.steps || 32)),
          params.guidance || 2.5,
          true,
          Math.min(1.5, Math.max(0.5, params.speed || 1.0)),
          null,
          true,
          true,
        ],
      };

      const callResp = await fetch(`${host}/gradio_api/call/_clone_fn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(callPayload),
      });
      if (!callResp.ok) continue;
      const { event_id } = (await callResp.json()) as { event_id?: string };
      if (!event_id) continue;

      const sseResp = await fetch(`${host}/gradio_api/call/_clone_fn/${event_id}`, {
        headers: authHeaders,
      });
      if (!sseResp.ok) continue;

      const sseText = await sseResp.text();
      if (sseText.includes('event: error')) {
        continue;
      }

      const lines = sseText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed.includes('"url"')) {
          const parsed = JSON.parse(trimmed.slice(6));
          const remoteAudioUrl = parsed?.[0]?.url as string | undefined;
          if (remoteAudioUrl) {
            const wavResp = await fetch(remoteAudioUrl, { headers: authHeaders });
            if (wavResp.ok) {
              const wavBlob = await wavResp.blob();
              if (wavBlob.size > 1000) {
                const objectUrl = URL.createObjectURL(wavBlob);
                const durationSec = Math.max(
                  1.5,
                  Number(((Math.max(0, wavBlob.size - 44)) / 48000).toFixed(1)),
                );
                return { audioUrl: objectUrl, durationSec };
              }
            }
          }
        }
      }
    } catch {
      // Try next OmniVoice host
    }
  }

  return null;
}

export async function synthesizeNeuralSpeech(params: {
  text: string;
  instruct?: string;
  language?: string;
  profileName?: string;
  refText?: string;
  refAudioUrl?: string;
  refAudioBase64?: string;
  kind?: string;
  steps?: number;
  guidance?: number;
  speed?: number;
  seed?: number;
  hfToken?: string;
}): Promise<{
  audioUrl: string;
  durationSec: number;
  peaks: number[];
  isNeural: boolean;
  engineLabel?: string;
}> {
  const cacheKey = `${params.kind || 'clone'}|${params.profileName || ''}|${params.refAudioUrl || ''}|${params.language || ''}|${params.speed || 1}|${params.text.trim()}`;
  const cached = neuralAudioCache.get(cacheKey);
  if (cached) {
    return { ...cached, isNeural: true };
  }

  const isCloneRequest =
    params.kind === 'clone' ||
    (params.profileName || '').toLowerCase().includes('babar') ||
    Boolean(params.refAudioBase64) ||
    (params.refAudioUrl || '').includes('babar');

  // 1. Direct client-side zero-shot voice cloning via k2-fsa/OmniVoice using user's browser IP
  if (isCloneRequest) {
    const clientCloned = await cloneClientSideWithOmniVoice(params);
    if (clientCloned) {
      const peaks = computeDeterministicPeaks(
        `${params.text}|${params.profileName || ''}|${params.seed || 42}`,
        48,
      );
      const result = {
        audioUrl: clientCloned.audioUrl,
        durationSec: clientCloned.durationSec,
        peaks,
        engineLabel: 'k2-fsa/OmniVoice (Zero-Shot Reference Clone)',
      };
      neuralAudioCache.set(cacheKey, result);
      return { ...result, isNeural: true };
    }
  }

  // 2. Server-side synthesis (/api/tts/synthesize)
  try {
    const response = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`TTS HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data?.audioDataUrl) {
      const peaks = computeDeterministicPeaks(
        `${params.text}|${params.instruct || ''}|${params.seed || 42}`,
        48,
      );
      const result = {
        audioUrl: data.audioDataUrl as string,
        durationSec: Number(data.durationSec) || 5.0,
        peaks,
        engineLabel: data.clonedFromReference
          ? 'k2-fsa/OmniVoice (Zero-Shot Reference Clone)'
          : `Gemini TTS Fallback (${data.voiceName || 'Puck'})`,
      };
      if (data.clonedFromReference) {
        neuralAudioCache.set(cacheKey, result);
      }
      return { ...result, isNeural: true };
    }
  } catch (err) {
    console.warn('Neural TTS fallback to local synth:', err);
  }

  const local = synthesizeSpeechWav({
    text: params.text,
    instruct: params.instruct,
    speed: params.speed,
    seed: params.seed,
  });
  return { ...local, isNeural: false, engineLabel: 'Local Synth Fallback' };
}

export async function analyzeReferenceClip(
  fileOrBlob: Blob,
  speakerHint = '',
): Promise<{ transcript: string; instruct: string; detectedLanguage: string } | null> {
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const audioBase64 = btoa(binary);
    const response = await fetch('/api/asr/analyze-reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType: fileOrBlob.type || 'audio/wav',
        speakerHint,
      }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function encodeWavFromFloat32(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

const LANG_BCP47_MAP: Record<string, string> = {
  english: 'en-US',
  urdu: 'ur-PK',
  اردو: 'ur-PK',
  'اردو (urdu)': 'ur-PK',
  spanish: 'es-ES',
  español: 'es-ES',
  french: 'fr-FR',
  français: 'fr-FR',
  german: 'de-DE',
  italian: 'it-IT',
  portuguese: 'pt-BR',
  russian: 'ru-RU',
  hindi: 'hi-IN',
  arabic: 'ar-SA',
  bengali: 'bn-IN',
  turkish: 'tr-TR',
  persian: 'fa-IR',
  chinese: 'zh-CN',
  中文: 'zh-CN',
  japanese: 'ja-JP',
  日本語: 'ja-JP',
  korean: 'ko-KR',
};

export function resolveBcp47Locale(language = 'English', instruct = '', text = ''): string {
  const lowerLang = language.trim().toLowerCase();
  if (LANG_BCP47_MAP[lowerLang]) {
    return LANG_BCP47_MAP[lowerLang];
  }
  // Auto-detect Urdu / Perso-Arabic script when language is Auto or English
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return 'ur-PK';
  }
  const lowerInst = instruct.toLowerCase();
  if (lowerInst.includes('british accent')) return 'en-GB';
  if (lowerInst.includes('australian accent')) return 'en-AU';
  if (lowerInst.includes('indian accent')) return 'en-IN';
  if (lowerInst.includes('canadian accent')) return 'en-CA';
  if (lowerInst.includes('american accent')) return 'en-US';
  return LANG_BCP47_MAP[lowerLang] || 'en-US';
}

export function stopBrowserSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function speakWithBrowserTts(params: {
  text: string;
  instruct?: string;
  language?: string;
  rate?: number;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  const clean = params.text.trim();
  if (!clean) return false;

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) {
    return false;
  }

  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    const targetBcp47 = resolveBcp47Locale(params.language, params.instruct, clean);
    utterance.lang = targetBcp47;

    const lowerInst = (params.instruct || '').toLowerCase();
    const wantFemale = lowerInst.includes('female');
    const wantMale = !wantFemale && lowerInst.includes('male');

    const langPrefix = targetBcp47.split('-')[0].toLowerCase();
    const matchingLocaleVoices = voices.filter((v) =>
      v.lang.toLowerCase().startsWith(targetBcp47.toLowerCase()),
    );
    const matchingLangVoices =
      matchingLocaleVoices.length > 0
        ? matchingLocaleVoices
        : voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));

    const pool = matchingLangVoices.length > 0 ? matchingLangVoices : voices;

    const femaleKeywords = [
      'female',
      'samantha',
      'victoria',
      'karen',
      'moira',
      'tessa',
      'fiona',
      'veena',
      'zira',
      'hazel',
      'susan',
      'aria',
      'jenny',
      'sonia',
      'natasha',
      'google uk english female',
    ];
    const maleKeywords = [
      'male',
      'daniel',
      'alex',
      'fred',
      'oliver',
      'rishi',
      'david',
      'mark',
      'george',
      'guy',
      'ryan',
      'christopher',
      'google uk english male',
    ];

    let chosenVoice = pool[0];
    if (wantFemale) {
      const fMatch = pool.find((v) =>
        femaleKeywords.some((k) => v.name.toLowerCase().includes(k)),
      );
      if (fMatch) chosenVoice = fMatch;
    } else if (wantMale) {
      const mMatch = pool.find((v) =>
        maleKeywords.some((k) => v.name.toLowerCase().includes(k)),
      );
      if (mMatch) chosenVoice = mMatch;
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    // Map taxonomy pitch to SpeechSynthesisUtterance.pitch (0.5 to 1.6)
    let pitch = 1.0;
    if (lowerInst.includes('very low pitch')) pitch = 0.65;
    else if (lowerInst.includes('low pitch')) pitch = 0.82;
    else if (lowerInst.includes('very high pitch')) pitch = 1.42;
    else if (lowerInst.includes('high pitch')) pitch = 1.22;
    if (lowerInst.includes('child')) pitch = Math.max(pitch, 1.35);
    utterance.pitch = pitch;

    utterance.rate = Math.max(0.5, Math.min(2.0, params.rate ?? params.speed ?? 1.0));
    utterance.volume = lowerInst.includes('whisper') ? 0.65 : 1.0;

    if (params.onStart) utterance.onstart = () => params.onStart?.();
    if (params.onEnd) utterance.onend = () => params.onEnd?.();
    if (params.onError) utterance.onerror = () => params.onError?.();

    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const rem = seconds - mins * 60;
  return `${mins.toString().padStart(2, '0')}:${rem.toFixed(1).padStart(4, '0')}`;
}
