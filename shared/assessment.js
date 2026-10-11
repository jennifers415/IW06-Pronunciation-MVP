// Keep existing client/server imports compatible with the reusable phrase catalog.
export { PHRASES, DEFAULT_PHRASE_ID, REFERENCE_TEXT, getPhrase } from './phrases.js';
export const MAX_AUDIO_SECONDS = 30;
export const SAMPLE_RATE = 16000;

// Guards the UI against pairing a word-level result with the wrong phrase
export function referenceContainsWord(word, referenceText) {
  if (typeof word !== 'string' || typeof referenceText !== 'string') return false;
  const tokens = referenceText.match(/[\p{L}\p{N}]+/gu) || [];
  return tokens.some((token) => token.toLocaleLowerCase() === word.trim().toLocaleLowerCase());
}

export function hasUsableWordScore(word) {
  return Number.isFinite(word?.accuracyScore)
    && word.accuracyScore >= 0
    && word.accuracyScore <= 100
    && !['unknown', 'unavailable'].includes(word?.errorType?.trim?.().toLocaleLowerCase());
}

export function formatWordScore(word) {
  return hasUsableWordScore(word) ? `${word.accuracyScore} / 100` : 'Not available';
}

export function assessReferenceAlignment(recognizedText, referenceText) {
  const tokens = (value) => typeof value === 'string'
    ? value.match(/[\p{L}\p{N}]+/gu)?.map((token) => token.toLocaleLowerCase()) || [] : [];
  const recognized = tokens(recognizedText);
  const reference = tokens(referenceText);
  const remaining = [...recognized];
  let matchedReferenceWordCount = 0;
  for (const token of reference) {
    const index = remaining.indexOf(token);
    if (index >= 0) {
      matchedReferenceWordCount += 1;
      remaining.splice(index, 1);
    }
  }
  const coverage = reference.length ? matchedReferenceWordCount / reference.length : 0;
  return {
    referenceWordCount: reference.length,
    recognizedWordCount: recognized.length,
    matchedReferenceWordCount,
    coverage,
    substantialMismatch: !recognized.length || !reference.length || coverage < 0.5,
  };
}
