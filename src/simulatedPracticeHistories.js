import { PHRASES, getPhrase } from '../shared/phrases.js';
import { createPronunciationObservations } from '../shared/pronunciationPatterns.js';

function makeHistory(words, mismatch = false) {
  const attempts = words.map(([phraseId, word], index) => {
    const phrase = getPhrase(phraseId);
    const flaggedWord = { word, accuracyScore: 62, errorType: 'Mispronunciation' };
    const attempt = {
      id: `simulated-${phraseId}-${index + 1}`, phraseId, referenceText: phrase.text,
      simulated: true, recordingUrl: '',
      assessment: {
        recognizedText: mismatch ? 'Unrelated speech.' : phrase.text,
        flaggedWord, words: [flaggedWord], alignment: { substantialMismatch: mismatch },
      },
    };
    return { ...attempt, pronunciationObservations: createPronunciationObservations(attempt) };
  });
  return PHRASES.map((phrase) => ({ phraseId: phrase.id, attempts: attempts.filter((attempt) => attempt.phraseId === phrase.id) }));
}
const rWords = [['library', 'where'], ['comfortable', 'very'], ['jacket', 'car']];
const lWords = [['library', 'tell'], ['coffee', 'little'], ['jacket', 'left']];

export const SIMULATED_PRACTICE_HISTORIES = {
  insufficient: { label: 'Limited evidence — two attempts', sessionPhrases: makeHistory(rWords.slice(0, 2)) },
  recurring: { label: 'Recurring R observations — three attempts', sessionPhrases: makeHistory(rWords) },
  mixed: { label: 'Recurring R and L observations', sessionPhrases: makeHistory([...rWords, ...lWords]) },
  more: { label: 'More R and L evidence — twelve attempts', sessionPhrases: makeHistory([...rWords, ...lWords, ...rWords, ...lWords]) },
  mismatch: { label: 'Unreliable alignment — no usable observations', sessionPhrases: makeHistory(rWords, true) },
};
