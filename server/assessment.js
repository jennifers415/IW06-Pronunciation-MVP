import { Buffer } from 'node:buffer';
import { assessReferenceAlignment, MAX_AUDIO_SECONDS, SAMPLE_RATE } from '../shared/assessment.js';

export class AssessmentError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function assessmentConfig(referenceText) {
  return {
  ReferenceText: referenceText,
  GradingSystem: 'HundredMark',
  Granularity: 'Word',
  Dimension: 'Comprehensive',
  EnableMiscue: true,
  EnableProsodyAssessment: false,
  };
}

const score = (value) => typeof value === 'number' && Number.isFinite(value)
  && value >= 0 && value <= 100 ? value : null;

export function normalizeAssessment(raw, referenceText = '') {
  if (['NoMatch', 'InitialSilenceTimeout', 'BabbleTimeout'].includes(raw?.RecognitionStatus)) {
    throw new AssessmentError(422, 'No clear speech was recognized. Please record the sentence again in a quiet place.');
  }
  if (raw?.RecognitionStatus !== 'Success') {
    throw new AssessmentError(502, 'Azure could not assess this recording. Please try again.');
  }
  const best = Array.isArray(raw.NBest) ? raw.NBest[0] : null;
  const recognizedText = [best?.Display, raw.DisplayText, best?.Lexical]
    .find((value) => typeof value === 'string' && value.trim())?.trim() || '';
  if (!recognizedText) {
    throw new AssessmentError(422, 'No clear speech was recognized. Please record the sentence again.');
  }
  const words = (Array.isArray(best?.Words) ? best.Words : [])
    .filter((entry) => typeof entry?.Word === 'string' && /[\p{L}\p{N}]/u.test(entry.Word))
    .map((entry) => {
      // REST uses flat fields; also tolerate the SDK's nested assessment shape.
      const details = entry.PronunciationAssessment || entry;
      return {
        word: entry.Word.trim(),
        accuracyScore: score(details.AccuracyScore),
        errorType: typeof details.ErrorType === 'string' ? details.ErrorType : 'Unknown',
      };
    });

  // Prefer mispronunciations first, then miscues, then the lowest-scoring word.
  // A low score alone does not mean the word was pronounced incorrectly.
  const issues = words.filter((word) => word.errorType === 'Mispronunciation');
  const miscues = words.filter((word) => ['Omission', 'Insertion'].includes(word.errorType));
  const candidates = issues.length ? issues : miscues.length ? miscues
    : words.filter((word) => word.accuracyScore !== null);
  const flaggedWord = [...candidates].sort((a, b) =>
    (a.accuracyScore ?? Infinity) - (b.accuracyScore ?? Infinity))[0] || null;
  return {
    recognizedText,
    overallAccuracy: score((best?.PronunciationAssessment || best)?.AccuracyScore),
    words,
    flaggedWord,
    alignment: assessReferenceAlignment(recognizedText, referenceText),
  };
}

export function validateWav(buffer) {
  const invalid = () => { throw new AssessmentError(415, 'Invalid audio. Please record again; assessment requires mono 16 kHz PCM WAV audio.'); };
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new AssessmentError(400, 'Your recording is empty. Please record again.');
  }
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF'
    || buffer.toString('ascii', 8, 12) !== 'WAVE'
    || buffer.readUInt32LE(4) + 8 !== buffer.length) invalid();
  let formatFound = false;
  let dataBytes = 0;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) invalid();
    if (type === 'fmt ') {
      if (size < 16 || buffer.readUInt16LE(start) !== 1
        || buffer.readUInt16LE(start + 2) !== 1
        || buffer.readUInt32LE(start + 4) !== SAMPLE_RATE
        || buffer.readUInt32LE(start + 8) !== SAMPLE_RATE * 2
        || buffer.readUInt16LE(start + 12) !== 2
        || buffer.readUInt16LE(start + 14) !== 16) invalid();
      formatFound = true;
    }
    if (type === 'data') {
      if (size % 2) invalid();
      dataBytes += size;
    }
    offset = start + size + (size % 2);
  }
  if (!formatFound || offset !== buffer.length) invalid();
  if (!dataBytes) throw new AssessmentError(400, 'Your recording is empty. Please record again.');
  if (dataBytes / (SAMPLE_RATE * 2) > MAX_AUDIO_SECONDS) {
    throw new AssessmentError(413, `Please record a shorter clip (up to ${MAX_AUDIO_SECONDS} seconds).`);
  }
}
