import express from 'express';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AssessmentError, assessmentConfig, normalizeAssessment, validateWav } from './assessment.js';
import { DEFAULT_PHRASE_ID, getPhrase } from '../shared/assessment.js';

export function createApp({ env = process.env, fetchAzure = fetch } = {}) {
  const app = express();
  const isProduction = env.NODE_ENV === 'production';
  app.disable('x-powered-by');
  app.post('/api/pronunciation', express.raw({ type: () => true, limit: '1mb' }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (!req.is('audio/wav')) {
        throw new AssessmentError(415, 'Unsupported audio format. Please record again in the app.');
      }
      validateWav(req.body);
      const phraseId = req.get('X-Phrase-Id') || DEFAULT_PHRASE_ID;
      const phrase = getPhrase(phraseId);
      if (!phrase) throw new AssessmentError(400, 'That practice phrase is not available. Choose another phrase and try again.');
      const key = env.AZURE_SPEECH_KEY?.trim();
      const region = env.AZURE_SPEECH_REGION?.trim();
      if (!key || !region) {
        throw new AssessmentError(503, 'Pronunciation assessment is not configured. Add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to the backend .env file, then restart the server.');
      }
      if (!/^[a-z0-9]+$/.test(region)) {
        throw new AssessmentError(503, 'The Azure region is invalid. Use the region identifier from your Speech resource, such as eastus.');
      }
      const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
      const azureAssessment = assessmentConfig(phrase.text);
      const pronunciationHeader = Buffer.from(JSON.stringify(azureAssessment)).toString('base64');
      const debugAudio = env.NODE_ENV !== 'production' && env.DEBUG_PRONUNCIATION_AUDIO === 'true';
      if (debugAudio) {
        const digest = createHash('sha256').update(req.body).digest('hex');
        const debugDir = env.DEBUG_PRONUNCIATION_AUDIO_DIR?.trim() || path.join(os.tmpdir(), 'pronunciation-mvp-audio');
        const debugName = `${Date.now()}-${phraseId}-${digest.slice(0, 12)}.wav`;
        try {
          await mkdir(debugDir, { recursive: true });
          const debugPath = path.join(debugDir, debugName);
          await writeFile(debugPath, req.body);
          console.debug('[pronunciation] received WAV diagnostics', {
            phraseId,
            bytes: req.body.length,
            sha256: digest,
            path: debugPath,
          });
        } catch (error) {
          console.warn('[pronunciation] could not save debug WAV', { message: error.message });
        }
      }
      // Temporary diagnostics: this confirms the phrase ID and reference that
      // reach the provider without logging audio, credentials, or transcripts.
      console.debug('[pronunciation] Azure request configuration', {
        phraseId,
        referenceText: phrase.text,
        assessment: azureAssessment,
      });
      const response = await fetchAzure(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          Accept: 'application/json',
          'Pronunciation-Assessment': pronunciationHeader,
        },
        body: req.body,
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) {
        const errors = {
          400: [422, 'Azure could not read this recording. Please record the sentence again.'],
          401: [503, 'Azure authentication failed. Check the backend Speech key and matching resource region.'],
          403: [503, 'Azure denied access. Check the Speech resource key, region, and network settings.'],
          415: [415, 'Azure could not read the audio format. Please record again.'],
          429: [429, 'Azure is busy or the resource quota has been reached. Please try again later.'],
        };
        throw new AssessmentError(...(errors[response.status] || [502, 'Azure assessment is unavailable. Please try again shortly.']));
      }
      res.json(normalizeAssessment(await response.json(), phrase.text));
    } catch (error) {
      const timeout = ['TimeoutError', 'AbortError'].includes(error.name);
      res.status(error instanceof AssessmentError ? error.status : timeout ? 504 : 502)
        .json({ error: error instanceof AssessmentError ? error.message : timeout
          ? 'Assessment took too long. Please try again.'
          : 'Could not reach Azure or read its response. Please try again.' });
      }
  });
  if (isProduction) {
    const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
    const indexPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath, { index: false }));
    app.get('/', (req, res) => res.sendFile(indexPath));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      return res.sendFile(indexPath);
    });
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({
      error: error.type === 'entity.too.large'
        ? 'The recording is too large. Please record a clip under 30 seconds.'
        : 'The audio upload could not be read. Please record again.',
    });
  });
  return app;
}
