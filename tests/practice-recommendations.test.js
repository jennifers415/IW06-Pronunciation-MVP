import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRecommendationChoices, updateRecommendationChoices, getPracticeRecommendations } from '../src/practiceRecommendations.js';
import { SIMULATED_PRACTICE_HISTORIES as histories } from '../src/simulatedPracticeHistories.js';

const view = (historyId, choices = emptyRecommendationChoices()) => getPracticeRecommendations(histories[historyId].sessionPhrases, choices);
const decide = (choices, action, featureId, targetId) => updateRecommendationChoices(choices, { action, featureId, targetId });

test('reuses recurrence threshold and excludes unreliable evidence', () => {
  assert.equal(view('insufficient').suggestion, null);
  assert.equal(view('mismatch').suggestion, null);
  const suggestion = view('recurring').suggestion;
  assert.equal(suggestion.featureId, 'r');
  assert.equal(suggestion.count, 3);
  assert.equal(suggestion.phraseIds.length, 3);
  assert.deepEqual(suggestion.flaggedWords, ['where', 'very', 'car']);
});

test('rejecting a focus suppresses it after more attempts without hiding other options', () => {
  const choices = decide(emptyRecommendationChoices(), 'reject', 'r');
  assert.equal(view('recurring', choices).suggestion, null);
  assert.equal(view('mixed', choices).suggestion.featureId, 'l');
  assert.equal(view('more', choices).suggestion.featureId, 'l');
  const noMore = decide(choices, 'reject', 'l');
  assert.equal(view('more', noMore).suggestion, null);
  assert.equal(view('more', noMore).hasRecurring, true);
});

test('accepting saves a focus and offers tagged phrases without competing recommendations', () => {
  const choices = decide(emptyRecommendationChoices(), 'accept', 'r');
  const result = view('mixed', choices);
  assert.equal(result.suggestion, null);
  assert.equal(result.focusId, 'r');
  assert.ok(result.phrases.length > 0);
  assert.ok(result.phrases.every((phrase) => phrase.pronunciationFeatures.some((feature) => feature.featureId === 'r')));
  // New session evidence does not erase an explicit learner choice.
  assert.equal(getPracticeRecommendations([], choices).focusId, 'r');
});

test('redirect changes phrase suggestions, suppresses source, and does not invent evidence', () => {
  const choices = decide(emptyRecommendationChoices(), 'redirect', 'r', 'sh');
  const result = view('recurring', choices);
  assert.equal(result.focusId, 'sh');
  assert.equal(result.suggestion, null);
  assert.ok(result.phrases.every((phrase) => phrase.pronunciationFeatures.some((feature) => feature.featureId === 'sh')));
  const cleared = decide(choices, 'reject', 'sh');
  assert.equal(view('more', cleared).suggestion.featureId, 'l');
  assert.equal(cleared.decisions.r, 'redirect');
});

test('only an explicit choice re-enables a rejected focus', () => {
  const rejected = decide(emptyRecommendationChoices(), 'reject', 'r');
  const redirected = decide(rejected, 'redirect', 'l', 'r');
  assert.equal(redirected.focusId, 'r');
  assert.equal(redirected.decisions.r, 'accept');
});

test('decisions are immutable, idempotent, validated, and demo state is independent', () => {
  const live = emptyRecommendationChoices();
  const demo = decide(emptyRecommendationChoices(), 'reject', 'r');
  assert.equal(view('recurring', live).suggestion.featureId, 'r');
  assert.equal(view('recurring', demo).suggestion, null);
  assert.deepEqual(live, emptyRecommendationChoices());
  assert.deepEqual(decide(demo, 'reject', 'r'), demo);
  for (const args of [['invalid', 'r'], ['accept', 'invalid'], ['redirect', 'r', 'invalid'], ['redirect', 'r', 'r']]) {
    assert.equal(decide(live, ...args), live);
  }
});

test('fixture histories contain no audio and reuse the same evidence across expanded histories', () => {
  for (const history of Object.values(histories)) {
    for (const attempt of history.sessionPhrases.flatMap((phrase) => phrase.attempts)) {
      assert.equal(attempt.simulated, true);
      assert.equal(attempt.recordingUrl, '');
      assert.equal(attempt.recording, undefined);
      for (const observation of attempt.pronunciationObservations) assert.equal(observation.attemptId, attempt.id);
    }
  }
  assert.equal(view('more').suggestion.count, 6);
  const repeated = [...histories.recurring.sessionPhrases, ...histories.recurring.sessionPhrases];
  assert.equal(getPracticeRecommendations(repeated, emptyRecommendationChoices()).suggestion.count, 3);
});
