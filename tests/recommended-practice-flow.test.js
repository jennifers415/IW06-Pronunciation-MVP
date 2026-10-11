import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { PHRASES } from '../shared/phrases.js';
import { SIMULATED_PRACTICE_HISTORIES } from '../src/simulatedPracticeHistories.js';

// Exercise actual App handlers with state setters; this is not a browser test.
const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
function appHandler(name, context) {
  const declaration = source.match(new RegExp(`  function ${name}\\([^]*?\\n  }`));
  assert.ok(declaration);
  return vm.runInNewContext(`(${declaration[0]})`, context);
}
function harness() {
  const context = {
    PHRASES, screen: 'complete', busy: false, optionalPractice: false, scenarioId: '',
    studioReturnScreen: { current: 'practice' }, studioResponse: '',
    feedbackAudioRef: { current: null }, window: {}, researchLog: [],
    learnerGoal: 'explore', feedbackOrder: 'learner-first',
    sessionPhrasesRef: { current: structuredClone(SIMULATED_PRACTICE_HISTORIES.mixed.sessionPhrases) },
    attemptsRef: { current: [] }, events: [], clearDraftRecording: () => {},
  };
  for (const field of ['view', 'phraseIndex', 'attempts', 'attemptNumber', 'assessment', 'scenarioId', 'learnerFirstJudgment', 'postAiResponse', 'error', 'expanded', 'status', 'optionalPractice', 'screen', 'sessionPhrases', 'studioResponse']) {
    context[`set${field[0].toUpperCase()}${field.slice(1)}`] = (value) => { context[field] = value; };
  }
  context.setResearchLog = (update) => { context.researchLog = update(context.researchLog); };
  context.changeScenario = appHandler('changeScenario', context);
  context.logRecommendationEvent = (event) => context.events.push(event);
  return context;
}

test('explicit optional practice preserves earlier attempts and returns to summary after feedback', () => {
  const context = harness();
  const oldSession = structuredClone(context.sessionPhrasesRef.current);
  const start = appHandler('startRecommendedPractice', context);
  start('library', 'r');
  assert.equal(context.screen, 'practice');
  assert.equal(context.optionalPractice, true);
  assert.equal(context.status, 'idle');
  assert.equal(context.attemptNumber, oldSession[0].attempts.length + 1);
  assert.deepEqual(context.attemptsRef.current, oldSession[0].attempts);
  assert.equal(context.events.length, 1);
  assert.equal(context.events[0].action, 'practice');
  assert.equal(context.events[0].phraseId, 'library');
  const newAttempt = { ...oldSession[0].attempts[0], id: 'new-live-attempt' };
  appHandler('setAttemptHistory', context)([...context.attemptsRef.current, newAttempt]);
  appHandler('finishPractice', context)(true);
  assert.equal(context.screen, 'complete');
  assert.equal(context.optionalPractice, false);
  assert.equal(context.sessionPhrasesRef.current[0].attempts.length, oldSession[0].attempts.length + 1);
  assert.equal(context.sessionPhrasesRef.current[0].attempts.at(-1).learnerDecision, 'understandable');
  assert.deepEqual(Array.from(context.sessionPhrasesRef.current).slice(1), oldSession.slice(1));
});

test('optional practice cannot interrupt processing or a normal session', () => {
  for (const state of [{ busy: true }, { screen: 'feedback' }, { screen: 'practice' }]) {
    const context = Object.assign(harness(), state);
    appHandler('startRecommendedPractice', context)('library', 'r');
    assert.equal(context.events.length, 0);
    assert.equal(context.optionalPractice, false);
  }
});

test('normal finish still advances and learners can leave optional practice without recording', () => {
  const normal = harness();
  normal.phraseIndex = 0;
  normal.attemptsRef.current = normal.sessionPhrasesRef.current[0].attempts;
  appHandler('finishPractice', normal)(false);
  assert.equal(normal.phraseIndex, 1);
  assert.equal(normal.screen, 'practice');
  const optional = harness();
  appHandler('startRecommendedPractice', optional)('library', 'r');
  const history = optional.sessionPhrasesRef.current;
  appHandler('leaveOptionalPractice', optional)();
  assert.equal(optional.screen, 'complete');
  assert.equal(optional.optionalPractice, false);
  assert.equal(optional.sessionPhrasesRef.current, history);
});

function reflectionPending(context) {
  const expression = source.match(/const reflectionPending = ([^]*?);/)[1];
  return vm.runInNewContext(expression, context);
}

test('studio switching cannot disclose an unfinished live learner-first attempt', () => {
  const context = Object.assign(harness(), {
    screen: 'feedback', currentAttempt: { id: 'live-attempt' }, learnerFirstResponse: '',
  });
  assert.equal(reflectionPending(context), true);
  context.changeScenario({ target: { value: 'studio-example' } });
  assert.equal(context.screen, 'feedback');
  assert.equal(reflectionPending(context), true);
  // All live evidence surfaces must consume this same guard.
  assert.match(source, /reflectionPending=\{reflectionPending\}/);
  assert.match(source, /progress=\{reflectionPending \? reflectionNotice/);
  assert.match(source, /reflectionPending \? reflectionNotice : <PracticeRecommendations/);
  context.changeScenario({ target: { value: '' } });
  assert.equal(reflectionPending(context), true);
  context.learnerFirstResponse = 'none';
  context.changeScenario({ target: { value: 'studio-example' } });
  assert.equal(reflectionPending(context), false);
  context.learnerFirstResponse = '';
  context.feedbackOrder = 'ai-first';
  assert.equal(reflectionPending(context), false);
});

test('studio responses, challenges, and final actions log as simulated without mutating live state', () => {
  for (const handler of ['startAnotherAttempt', 'finishPractice']) {
    const context = Object.assign(harness(), {
      screen: 'feedback', phraseIndex: 0, optionalPractice: true,
      learnerFirstJudgment: { goalId: 'explore', value: 'none' },
      postAiResponse: 'ai-misunderstood', attemptNumber: 4,
    });
    context.attemptsRef.current = context.sessionPhrasesRef.current[0].attempts;
    context.currentAttempt = context.attemptsRef.current.at(-1);
    const before = structuredClone(context.sessionPhrasesRef.current);
    context.clearDraftRecording = () => assert.fail('Studio actions must not clear live audio');
    context.setLearnerPreferences = () => assert.fail('Studio actions must not change live preferences');
    context.changeScenario({ target: { value: 'studio-example' } });
    appHandler('handlePostResponse', context)('explore');
    assert.equal(context.postAiResponse, 'ai-misunderstood');
    assert.equal(context.studioResponse, 'explore');
    appHandler('logChallenge', context)('model-mismatch');
    appHandler('logAction', context)('hear-example');
    appHandler('logFinalAction', context)('continue', context.postAiResponse);
    appHandler('rememberPreference', context)('word', 'keep');
    appHandler(handler, context)(true);
    assert.deepEqual(context.sessionPhrasesRef.current, before);
    assert.equal(context.phraseIndex, 0);
    assert.equal(context.attemptNumber, 4);
    assert.equal(context.optionalPractice, true);
    assert.equal(context.screen, 'feedback');
    assert.equal(context.scenarioId, '');
    assert.equal(context.learnerFirstJudgment.value, 'none');
    assert.equal(context.postAiResponse, 'ai-misunderstood');
    assert.equal(context.researchLog.length, 4);
    for (const event of context.researchLog) {
      assert.equal(event.simulated, true);
      assert.equal(event.scenarioId, 'studio-example');
    }
    const challenge = context.researchLog.find((event) => event.event === 'challenge-ai');
    assert.equal(challenge.attemptId, null);
    assert.equal(challenge.response, 'model-mismatch');
    assert.equal(context.researchLog.at(-1).response, 'explore');
  }
});

test('switching between studio scenarios preserves the original live return stage', () => {
  for (const screen of ['goal', 'practice', 'feedback', 'complete']) {
    const context = Object.assign(harness(), { screen });
    context.changeScenario({ target: { value: 'first' } });
    context.changeScenario({ target: { value: 'second' } });
    context.changeScenario({ target: { value: '' } });
    assert.equal(context.screen, screen);
  }
});

test('live response and challenge events retain their live association', () => {
  const context = Object.assign(harness(), { currentAttempt: { id: 'live-attempt' } });
  appHandler('handlePostResponse', context)('none');
  appHandler('logChallenge', context)('model-mismatch');
  appHandler('logFinalAction', context)('continue', 'none');
  assert.equal(context.postAiResponse, 'none');
  for (const event of context.researchLog) assert.equal(event.simulated, false);
  assert.equal(context.researchLog[1].attemptId, 'live-attempt');
  assert.equal(context.researchLog[1].scenarioId, null);
  assert.equal(context.researchLog[2].response, 'none');
});
