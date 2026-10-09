import { assessReferenceAlignment, hasUsableWordScore } from './assessment.js';
import { getPhrase, PRONUNCIATION_FEATURES } from './phrases.js';

export const RECURRING_PATTERN_ATTEMPTS = 3;

function wordKey(value) {
  if (typeof value !== 'string') return '';
  const tokens = value.match(/[\p{L}\p{N}]+/gu) || [];
  return tokens.length === 1 ? tokens[0].toLowerCase() : '';
}

// Consume the existing normalized flaggedWord, without selecting new feedback.
// A fallback highlight with score < 100 is a lower model match, not a diagnosis.
// Tags identify possible features in a word; word scores cannot isolate which
// sound caused the highlight. Never interpret these observations as weaknesses.
export function createPronunciationObservations(attempt) {
  if (!attempt?.id || !attempt.phraseId) return [];
  const phrase = getPhrase(attempt.phraseId);
  const assessment = attempt.assessment;
  const flaggedWord = assessment?.flaggedWord;
  if (!phrase || attempt.referenceText !== phrase.text
    || !hasUsableWordScore(flaggedWord)
    || !['None', 'Mispronunciation'].includes(flaggedWord.errorType)
    || (flaggedWord.errorType === 'None' && flaggedWord.accuracyScore === 100)
    || assessment.alignment?.substantialMismatch === true
    || assessReferenceAlignment(assessment.recognizedText, phrase.text).substantialMismatch) return [];

  const key = wordKey(flaggedWord.word);
  if (!key || !phrase.text.match(/[\p{L}\p{N}]+/gu)?.some((word) => wordKey(word) === key)) return [];
  const features = phrase.pronunciationFeatures.filter((feature) =>
    feature.words.some((word) => wordKey(word) === key));

  return [...new Set(features.map((feature) => feature.featureId))].map((featureId) => ({
    featureId,
    word: key,
    flaggedWord: flaggedWord.word,
    attemptId: attempt.id,
    phraseId: phrase.id,
    assessedAt: attempt.assessedAt ?? null,
    accuracyScore: flaggedWord.accuracyScore,
    errorType: flaggedWord.errorType,
  }));
}

// Summarize observations from the current session only. No time-window or
// persistence across sessions is implied. Rebuilding after a history update is
// idempotent: repeated evidence never increases a feature's recording count.
export function summarizePronunciationObservations(observations) {
  const unique = new Map();
  const features = new Map();
  for (const observation of observations) {
    if (!Object.hasOwn(PRONUNCIATION_FEATURES, observation.featureId)) continue;
    const { featureId, phraseId, attemptId, word } = observation;
    const evidenceKey = JSON.stringify([featureId, phraseId, attemptId, word]);
    if (unique.has(evidenceKey)) continue;
    unique.set(evidenceKey, { ...observation });
    if (!features.has(featureId)) features.set(featureId, {
      featureId, recordings: new Set(), flaggedWords: new Set(), attemptIds: new Set(), phraseIds: new Set(),
    });
    const feature = features.get(featureId);
    feature.recordings.add(JSON.stringify([phraseId, attemptId]));
    feature.flaggedWords.add(word);
    feature.attemptIds.add(attemptId);
    feature.phraseIds.add(phraseId);
  }
  return {
    observations: [...unique.values()],
    features: [...features.values()].map((feature) => ({
      featureId: feature.featureId,
      count: feature.recordings.size,
      isRecurring: feature.recordings.size >= RECURRING_PATTERN_ATTEMPTS,
      flaggedWords: [...feature.flaggedWords],
      attemptIds: [...feature.attemptIds],
      phraseIds: [...feature.phraseIds],
    })),
  };
}
