import { REFERENCE_TEXT } from '../shared/assessment.js';

// Studio examples only, not a fallback for failed Azure requests.
// Agreement and disagreement use the same evidence; only the learner's response changes.
// Scenario names describe the exercise, not the actual result.
const library = { word: 'library', accuracyScore: 62, errorType: 'Mispronunciation' };
const matchingResult = {
  recognizedText: REFERENCE_TEXT,
  overallAccuracy: 84,
  words: [library],
  flaggedWord: library,
};
const could = { word: 'Could', accuracyScore: 0, errorType: 'Omission' };

export const SCENARIOS = {
  agreement: {
    label: 'Agreement',
    prompt: 'Explore choosing to practice the highlighted word after considering the feedback.',
    result: matchingResult,
  },
  disagreement: {
    label: 'Disagreement',
    prompt: 'Explore believing you were understandable and choosing to keep your pronunciation.',
    result: matchingResult,
  },
  questionable: {
    label: 'Questionable assessment',
    prompt: 'Explore an apparent omission and an incomplete transcript. Try the “I’m not sure” response.',
    result: {
      recognizedText: 'Tell me where the library is.',
      overallAccuracy: null,
      words: [could],
      flaggedWord: could,
    },
  },
};

export function transcriptMatchesReference(text, referenceText = REFERENCE_TEXT) {
  const normalize = (value) => typeof value === 'string'
    ? (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join(' ') : '';
  const normalized = normalize(text);
  return Boolean(normalized) && normalized === normalize(referenceText);
}
