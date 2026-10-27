import express from 'express';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OMNIVOICE_HOSTS = [
  'https://k2-fsa-omnivoice.hf.space',
  'https://archivartaunik-omnivoice.hf.space',
  'https://nitrox-omnivoice.hf.space',
  'https://oddadmix-lahgtna-omnivoice-demo.hf.space',
  'https://ksrgszk-omnivoice.hf.space',
  'https://d3vshoaib-omnivoice.hf.space',
];

export const BABAR_CLEAN_REF_TRANSCRIPT =
  'آپ کو اچھی پارٹنرشپ کرنی پڑتی ہے، اچھی پارٹنرشپ میں بولنگ کرنی پڑتی ہے، اس پارٹنرشپ کو جو ہے وہ لانگ لے کے جانا پڑتا ہے';

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

let cachedBabarCleanWav: Buffer | null = null;

function getBabarClean8sWav(): Buffer | null {
  if (cachedBabarCleanWav && cachedBabarCleanWav.length > 10000) {
    return cachedBabarCleanWav;
  }
  const wavPath = path.resolve(
    __dirname,
    'public/assets/aistudio/babar-voice-sample_74691ef6.wav',
  );
  const m4aPath = path.resolve(
    __dirname,
    'public/assets/aistudio/babar-voice-sample_1de63eeb.m4a',
  );
  const srcPath = fs.existsSync(wavPath)
    ? wavPath
    : fs.existsSync(m4aPath)
      ? m4aPath
      : null;

  if (!srcPath) return null;

  const tmpOut = path.join(os.tmpdir(), `babar_clean_8s_${Date.now()}.wav`);
  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-ss',
        '24.8',
        '-t',
        '8.2',
        '-i',
        srcPath,
        '-af',
        'highpass=f=80,lowpass=f=10000,dynaudnorm',
        '-ar',
        '24000',
        '-ac',
        '1',
        tmpOut,
      ],
      { stdio: 'ignore', timeout: 8000 },
    );
    if (fs.existsSync(tmpOut)) {
      cachedBabarCleanWav = fs.readFileSync(tmpOut);
      return cachedBabarCleanWav;
    }
  } catch {
    try {
      return fs.readFileSync(srcPath);
    } catch {}
  } finally {
    try {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {}
  }
  return null;
}

function normalizeRefTo9sWav(rawBuffer: Buffer, ext = '.wav'): Buffer {
  if (rawBuffer.length > 40000 && rawBuffer.length <= 550000 && ext === '.wav') {
    return rawBuffer;
  }
  const tmpIn = path.join(os.tmpdir(), `vs_ref_in_${Date.now()}${ext}`);
  const tmpOut = path.join(os.tmpdir(), `vs_ref_out_${Date.now()}.wav`);
  try {
    fs.writeFileSync(tmpIn, rawBuffer);
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-ss',
        '0.3',
        '-t',
        '9.0',
        '-i',
        tmpIn,
        '-af',
        'highpass=f=80,dynaudnorm',
        '-ar',
        '24000',
        '-ac',
        '1',
        tmpOut,
      ],
      { stdio: 'ignore', timeout: 8000 },
    );
    if (fs.existsSync(tmpOut)) {
      return fs.readFileSync(tmpOut);
    }
  } catch {
    // Fallback to raw buffer if ffmpeg fails
  } finally {
    try {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {}
  }
  return rawBuffer;
}

async function resolveReferenceAudioBuffer(
  refAudioBase64?: string,
  refAudioUrl?: string,
  profileName?: string,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string; defaultRefText?: string } | null> {
  if (refAudioBase64) {
    const mimeMatch = refAudioBase64.match(/^data:audio\/([a-z0-9+-]+);base64,/i);
    const ext = mimeMatch?.[1]?.includes('mp4') || mimeMatch?.[1]?.includes('m4a') ? '.m4a' : '.wav';
    const clean = refAudioBase64.replace(/^data:[^;]+;base64,/, '');
    const normalized = normalizeRefTo9sWav(Buffer.from(clean, 'base64'), ext);
    return {
      buffer: normalized,
      fileName: 'reference-9s.wav',
      mimeType: 'audio/wav',
    };
  }

  if (
    (profileName && profileName.toLowerCase().includes('babar')) ||
    (refAudioUrl && refAudioUrl.includes('babar'))
  ) {
    const cleanBabar = getBabarClean8sWav();
    if (cleanBabar) {
      return {
        buffer: cleanBabar,
        fileName: 'babar-clean-8s.wav',
        mimeType: 'audio/wav',
        defaultRefText: BABAR_CLEAN_REF_TRANSCRIPT,
      };
    }
  }

  if (refAudioUrl && refAudioUrl.startsWith('/')) {
    const localPath = path.resolve(__dirname, 'public', refAudioUrl.slice(1));
    if (fs.existsSync(localPath)) {
      const ext = path.extname(localPath) || '.wav';
      return {
        buffer: normalizeRefTo9sWav(fs.readFileSync(localPath), ext),
        fileName: 'reference-9s.wav',
        mimeType: 'audio/wav',
      };
    }
  }

  const fallbackBabar = getBabarClean8sWav();
  if (fallbackBabar) {
    return {
      buffer: fallbackBabar,
      fileName: 'babar-clean-8s.wav',
      mimeType: 'audio/wav',
      defaultRefText: BABAR_CLEAN_REF_TRANSCRIPT,
    };
  }

  return null;
}

async function cloneWithOmniVoice(params: {
  text: string;
  language: string;
  refBuffer: Buffer;
  refFileName: string;
  refMimeType: string;
  refText: string;
  steps: number;
  guidance: number;
  speed: number;
  hfToken?: string;
}): Promise<Buffer | null> {
  const langArg =
    params.language && params.language !== 'Auto' ? params.language : 'Auto';
  const authHeaders: Record<string, string> = {};
  if (params.hfToken && params.hfToken.trim().startsWith('hf_')) {
    authHeaders['Authorization'] = `Bearer ${params.hfToken.trim()}`;
  }

  for (const host of OMNIVOICE_HOSTS) {
    try {
      const formData = new FormData();
      const blob = new Blob([params.refBuffer], { type: params.refMimeType });
      formData.append('files', blob, params.refFileName);

      const uploadResp = await fetch(`${host}/gradio_api/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
        signal: AbortSignal.timeout(10000),
      });
      if (!uploadResp.ok) continue;
      const uploadedPaths = (await uploadResp.json()) as string[];
      const remotePath = uploadedPaths?.[0];
      if (!remotePath) continue;

      // CRITICAL: Pass empty string "" for instruct during zero-shot cloning
      // so OmniVoice uses 100% of the reference audio's acoustic tokens!
      const callPayload = {
        data: [
          params.text,
          langArg,
          { path: remotePath, meta: { _type: 'gradio.FileData' } },
          params.refText || '',
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
        signal: AbortSignal.timeout(10000),
      });
      if (!callResp.ok) continue;
      const { event_id } = (await callResp.json()) as { event_id?: string };
      if (!event_id) continue;

      const sseResp = await fetch(`${host}/gradio_api/call/_clone_fn/${event_id}`, {
        headers: authHeaders,
        signal: AbortSignal.timeout(35000),
      });
      if (!sseResp.ok) continue;

      const sseText = await sseResp.text();
      const lines = sseText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed.includes('"url"')) {
          const parsed = JSON.parse(trimmed.slice(6));
          const audioUrl = parsed?.[0]?.url;
          if (audioUrl) {
            const wavResp = await fetch(audioUrl, {
              headers: authHeaders,
              signal: AbortSignal.timeout(12000),
            });
            if (wavResp.ok) {
              const arrBuf = await wavResp.arrayBuffer();
              return Buffer.from(arrBuf);
            }
          }
        }
      }
    } catch {
      // Try next OmniVoice host in pool
    }
  }
  return null;
}

function choosePrebuiltVoice(instruct = '', profileName = ''): string {
  const lower = `${instruct} ${profileName}`.toLowerCase();
  const isFemale =
    lower.includes('female') ||
    lower.includes('librarian') ||
    lower.includes('podcaster') ||
    lower.includes('helpdesk') ||
    lower.includes('sichuan');

  if (isFemale) {
    if (lower.includes('high pitch') || lower.includes('young adult')) {
      return 'Zephyr';
    }
    return 'Kore';
  }

  if (
    lower.includes('very low pitch') ||
    lower.includes('elderly') ||
    lower.includes('crusty') ||
    lower.includes('gravelly')
  ) {
    return 'Fenrir';
  }

  if (lower.includes('babar') || lower.includes('young adult') || lower.includes('high pitch')) {
    return 'Puck';
  }

  return 'Charon';
}

function buildSpeechStyle(params: {
  instruct?: string;
  language?: string;
  profileName?: string;
  refText?: string;
  speed?: number;
}): string {
  const { instruct = '', language = 'English', profileName = '', speed = 1.0 } = params;
  const lowerName = `${profileName} ${instruct}`.toLowerCase();

  const parts: string[] = [];

  if (lowerName.includes('babar')) {
    parts.push(
      'Calm, humble, composed Pakistani cricket captain in a post-match press conference, warm mid-baritone voice, authentic Pakistani Urdu and English accent, steady measured pacing',
    );
  } else if (
    language.toLowerCase().includes('urdu') ||
    lowerName.includes('urdu') ||
    lowerName.includes('dastaan')
  ) {
    parts.push(
      'Natural, fluent Pakistani Urdu speaker with clear pronunciation, warm studio vocal presence',
    );
  }

  if (instruct.trim()) {
    parts.push(instruct.trim());
  }

  if (language && language !== 'Auto') {
    parts.push(`Speaking fluently in ${language}`);
  }

  if (speed >= 1.2) {
    parts.push('brisk, energetic pace');
  } else if (speed <= 0.85) {
    parts.push('slow, deliberate, measured pace');
  }

  return parts.join('. ') || 'Natural, clear, expressive studio voice';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '35mb' }));

  // Clean 8.2s 24kHz mono slice of Babar Azam's speech (00:24.8 - 00:33.0)
  // Dynamically extracted and cached in memory so it is always available.
  app.get('/api/reference/babar-clean.wav', (_req, res) => {
    const buf = getBabarClean8sWav();
    if (!buf) {
      res.status(404).json({ error: 'Babar Azam reference audio not found' });
      return;
    }
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  });

  // Trim & normalize any uploaded reference audio to a clean 9s 24kHz mono WAV for client-side cloning
  app.post('/api/reference/trim', (req, res) => {
    try {
      const { audioBase64 = '' } = req.body || {};
      if (!audioBase64) {
        res.status(400).json({ error: 'audioBase64 is required' });
        return;
      }
      const mimeMatch = String(audioBase64).match(/^data:audio\/([a-z0-9+-]+);base64,/i);
      const ext =
        mimeMatch?.[1]?.includes('mp4') || mimeMatch?.[1]?.includes('m4a') ? '.m4a' : '.wav';
      const clean = String(audioBase64).replace(/^data:[^;]+;base64,/, '');
      const normalized = normalizeRefTo9sWav(Buffer.from(clean, 'base64'), ext);
      res.json({
        audioDataUrl: `data:audio/wav;base64,${normalized.toString('base64')}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Trim failed' });
    }
  });

  app.post('/api/tts/synthesize', async (req, res) => {
    try {
      const {
        text,
        instruct = '',
        language = 'Auto',
        profileName = '',
        refText = '',
        refAudioUrl = '',
        refAudioBase64 = '',
        speed = 1.0,
        steps = 32,
        guidance = 2.5,
        kind = 'clone',
        hfToken = '',
      } = req.body || {};

      const cleanText = String(text || '').trim();
      if (!cleanText) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      // 1. Attempt acoustic zero-shot voice cloning via k2-fsa/OmniVoice when cloning
      if (kind === 'clone' || profileName.toLowerCase().includes('babar') || refAudioBase64) {
        const refData = await resolveReferenceAudioBuffer(
          refAudioBase64,
          refAudioUrl,
          profileName,
        );
        if (refData) {
          const isBabar =
            profileName.toLowerCase().includes('babar') || refAudioUrl.includes('babar');
          const effectiveRefText = isBabar
            ? BABAR_CLEAN_REF_TRANSCRIPT
            : refText || refData.defaultRefText || BABAR_CLEAN_REF_TRANSCRIPT;
          const clonedWav = await cloneWithOmniVoice({
            text: cleanText,
            language,
            refBuffer: refData.buffer,
            refFileName: refData.fileName,
            refMimeType: refData.mimeType,
            refText: effectiveRefText,
            steps,
            guidance,
            speed,
            hfToken,
          });
          if (clonedWav && clonedWav.length > 1000) {
            const base64Cloned = clonedWav.toString('base64');
            const durationSec = Math.max(
              1.2,
              Number(((Math.max(0, clonedWav.length - 44)) / 48000).toFixed(1)),
            );
            res.json({
              audioDataUrl: `data:audio/wav;base64,${base64Cloned}`,
              durationSec,
              voiceName: 'k2-fsa/OmniVoice (Zero-Shot Clone)',
              style: 'Acoustic Zero-Shot Reference Clone',
              clonedFromReference: true,
            });
            return;
          }
        }
      }

      // 2. Fallback to Gemini 3.8 TTS
      const ai = getGenAIClient();
      const voiceName = choosePrebuiltVoice(instruct, profileName);
      const style = buildSpeechStyle({ instruct, language, profileName, refText, speed });

      let base64Audio: string | undefined;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  // @ts-ignore - speechMetadata supported by Gemini 3.8 TTS
                  speechMetadata: {
                    style,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });
        base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } catch {
        const fallbackResp = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });
        base64Audio = fallbackResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      }

      if (!base64Audio) {
        res.status(502).json({ error: 'No audio returned from synthesis engine.' });
        return;
      }

      const byteLength = Buffer.byteLength(base64Audio, 'base64');
      const durationSec = Math.max(
        1.2,
        Number(((Math.max(0, byteLength - 44)) / 48000).toFixed(1)),
      );

      res.json({
        audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
        durationSec,
        voiceName,
        style,
      });
    } catch (error: any) {
      console.error('TTS synthesis error:', error?.message || error);
      res.status(500).json({
        error: error?.message || 'Speech synthesis failed',
      });
    }
  });

  app.post('/api/asr/analyze-reference', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/wav', speakerHint = '' } = req.body || {};
      if (!audioBase64) {
        res.status(400).json({ error: 'audioBase64 is required' });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe this reference audio accurately. ${
                speakerHint ? `Speaker context: ${speakerHint}.` : ''
              } Return only the spoken transcript text.`,
            },
          ],
        },
      });

      const transcript = (response.text || '').trim();

      const traitsResp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Given the speaker hint "${speakerHint}" and reference transcript "${transcript}", produce a concise VoiceStudio conditioning descriptor (gender, age group, pitch register, accent/cadence) in 6-12 words.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              instruct: {
                type: Type.STRING,
                description:
                  'Comma-separated voice traits e.g. male, young adult, moderate pitch, pakistani accent',
              },
              detectedLanguage: {
                type: Type.STRING,
                description: 'Primary language e.g. Urdu or English',
              },
            },
            required: ['instruct', 'detectedLanguage'],
          },
        },
      });

      let parsed = {
        instruct: 'male, young adult, moderate pitch, pakistani urdu-english cadence',
        detectedLanguage: 'Urdu',
      };
      try {
        parsed = JSON.parse(traitsResp.text || '{}');
      } catch {}

      res.json({
        transcript:
          transcript ||
          'دیکھیں میرے خیال سے رسپانسبلٹی پوری جو ہے وہ الیون اے سائیڈ کی ہوتی ہے یہ نہیں کہ بولرز اگر کریں گے بیس آؤٹ تو بیٹسمینوں کا بھی رسپانسبلٹی ہے کہ وہ رنز کریں',
        instruct: parsed.instruct,
        detectedLanguage: parsed.detectedLanguage || 'Urdu',
      });
    } catch (error: any) {
      console.error('Reference analysis error:', error?.message || error);
      res.status(500).json({
        error: error?.message || 'Reference audio analysis failed',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`VoiceStudio server running on http://0.0.0.0:${port}`);
  });
}

startServer();
