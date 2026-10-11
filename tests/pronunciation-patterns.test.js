import test from 'node:test';
import assert from 'node:assert/strict';
import { getPhrase } from '../shared/phrases.js';
import { normalizeAssessment } from '../server/assessment.js';
import { createPronunciationObservations, summarizePronunciationObservations } from '../shared/pronunciationPatterns.js';

function attempt(id = 'library-1', phraseId = 'library', word = 'library', accuracyScore = 58, errorType = 'Mispronunciation') {
  const phrase = getPhrase(phraseId);
  return {
    id, phraseId, referenceText: phrase.text, assessedAt: '2026-10-07T12:00:00.000Z',
    assessment: normalizeAssessment({
      RecognitionStatus: 'Success',
      NBest: [{ Display: phrase.text, Words: [{ Word: word, AccuracyScore: accuracyScore, ErrorType: errorType }] }],
    }, phrase.text),
  };
}

const summarize = (attempts) => summarizePronunciationObservations(attempts.flatMap(createPronunciationObservations));

test('maps a normalized Azure highlight to every tagged feature and preserves evidence', () => {
  const input = attempt();
  const before = structuredClone(input);
  const observations = createPronunciationObservations(input);
  assert.deepEqual(observations.map((item) => item.featureId), ['r', 'l', 'consonant_clusters']);
  assert.deepEqual(observations[0], {
    featureId: 'r', word: 'library', flaggedWord: 'library', attemptId: 'library-1', phraseId: 'library',
    assessedAt: input.assessedAt, accuracyScore: 58, errorType: 'Mispronunciation',
  });
  assert.deepEqual(input, before);
});

test('requires three distinct attempts and retains counts across different phrases', () => {
  const attempts = [attempt(), attempt('comfortable-1', 'comfortable', 'chair'), attempt('train-1', 'train', 'train')];
  for (const length of [1, 2, 3]) {
    const history = summarize(attempts.slice(0, length));
    const r = history.features.find((feature) => feature.featureId === 'r');
    assert.equal(r.count, length);
    assert.equal(r.isRecurring, length === 3);
  }
  const history = summarize(attempts);
  const r = history.features.find((feature) => feature.featureId === 'r');
  assert.deepEqual(r.flaggedWords, ['library', 'chair', 'train']);
  assert.deepEqual(r.phraseIds, ['library', 'comfortable', 'train']);
  assert.deepEqual(r.attemptIds, ['library-1', 'comfortable-1', 'train-1']);
  assert.equal(history.features.find((feature) => feature.featureId === 'l').isRecurring, false);
});

test('retries of one phrase count, but duplicate attempts and multiple words in one recording do not inflate counts', () => {
  const attempts = [attempt('1'), attempt('2'), attempt('3')];
  const once = summarize(attempts);
  assert.deepEqual(summarize([...attempts, ...attempts]), once);
  assert.equal(once.features.find((feature) => feature.featureId === 'r').count, 3);
  const observations = createPronunciationObservations(attempt());
  const history = summarizePronunciationObservations([
    ...observations, { ...observations[0], word: 'where', flaggedWord: 'where' },
  ]);
  const r = history.features.find((feature) => feature.featureId === 'r');
  assert.equal(r.count, 1);
  assert.equal(r.isRecurring, false);
  assert.deepEqual(r.flaggedWords, ['library', 'where']);
});

test('handles case, surrounding punctuation, voiced/unvoiced th, and untagged words', () => {
  assert.equal(createPronunciationObservations(attempt('1', 'library', ' LIBRARY! '))[0].word, 'library');
  assert.deepEqual(createPronunciationObservations(attempt('2', 'comfortable', 'this')).map((o) => o.featureId), ['th_voiced']);
  assert.ok(createPronunciationObservations(attempt('3', 'thursday', 'think')).some((o) => o.featureId === 'th_unvoiced'));
  assert.deepEqual(createPronunciationObservations(attempt('4', 'library', 'Could')), []);
  assert.deepEqual(createPronunciationObservations(attempt('5', 'library', 'chair')), []);
  assert.deepEqual(createPronunciationObservations(attempt('6', 'library', 'the library')), []);
});

test('accepts valid lower-score highlights including zero; excludes perfect fallback scores', () => {
  for (const score of [0, 58, 96]) {
    assert.ok(createPronunciationObservations(attempt('1', 'library', 'library', score, 'None')).length);
  }
  assert.deepEqual(createPronunciationObservations(attempt('1', 'library', 'library', 100, 'None')), []);
  for (const score of [null, undefined, NaN, Infinity, -1, 101, '58']) {
    const input = attempt();
    input.assessment.flaggedWord.accuracyScore = score;
    assert.deepEqual(createPronunciationObservations(input), []);
  }
});

test('excludes miscues, unusable errors, missing evidence, and mismatched reference/transcript', () => {
  for (const errorType of ['Omission', 'Insertion', 'Unknown', 'Unavailable', undefined]) {
    const input = attempt();
    input.assessment.flaggedWord.errorType = errorType;
    assert.deepEqual(createPronunciationObservations(input), []);
  }
  const mutations = [
    (input) => { input.id = ''; },
    (input) => { input.phraseId = 'missing'; },
    (input) => { input.referenceText = 'A different phrase.'; },
    (input) => { input.assessment = null; },
    (input) => { input.assessment.flaggedWord = null; },
    (input) => { input.assessment.alignment.substantialMismatch = true; },
    (input) => { input.assessment.recognizedText = 'unrelated speech'; delete input.assessment.alignment; },
  ];
  for (const mutate of mutations) {
    const input = attempt();
    mutate(input);
    assert.deepEqual(createPronunciationObservations(input), []);
  }
  assert.deepEqual(createPronunciationObservations(null), []);
});

test('session summaries are serializable, do not mutate evidence, and reset with empty history', () => {
  const observations = createPronunciationObservations(attempt());
  const before = structuredClone(observations);
  const history = summarizePronunciationObservations(observations);
  assert.deepEqual(JSON.parse(JSON.stringify(history)), history);
  assert.deepEqual(observations, before);
  assert.deepEqual(summarizePronunciationObservations([]), { observations: [], features: [] });
  assert.equal(summarize([attempt()]).features[0].count, 1);
});
