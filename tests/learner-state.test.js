import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearnerJudgment, currentResponseForAttempt, isValidLearnerResponse, responseForGoal } from '../src/learnerState.js';

test('goal response mappings accept only the active goal values', () => {
  assert.deepEqual(createLearnerJudgment('understood', 'understood'), { goalId: 'understood', value: 'understood' });
  assert.deepEqual(createLearnerJudgment('understood', 'unclear'), { goalId: 'understood', value: 'unclear' });
  assert.deepEqual(createLearnerJudgment('understood', 'unsure'), { goalId: 'understood', value: 'unsure' });
  assert.equal(isValidLearnerResponse('understood', 'none'), false);

  assert.equal(isValidLearnerResponse('explore', 'explore'), true);
  assert.equal(isValidLearnerResponse('explore', 'none'), true);
  assert.equal(isValidLearnerResponse('explore', 'unsure'), true);
  assert.equal(isValidLearnerResponse('explore', 'understood'), false);

  assert.equal(isValidLearnerResponse('example', 'example-satisfied'), true);
  assert.equal(isValidLearnerResponse('example', 'example-practice'), true);
  assert.equal(isValidLearnerResponse('example', 'unsure'), true);
  assert.equal(isValidLearnerResponse('example', 'none'), false);
});

test('a judgment cannot leak when switching goals', () => {
  const exploreJudgment = createLearnerJudgment('explore', 'none');
  assert.equal(responseForGoal(exploreJudgment, 'explore'), 'none');
  assert.equal(responseForGoal(exploreJudgment, 'understood'), '');
  assert.equal(responseForGoal(exploreJudgment, 'example'), '');
});

test('resetting an attempt clears the canonical judgment', () => {
  const judgment = createLearnerJudgment('understood', 'understood');
  const reset = { goalId: '', value: '' };
  assert.equal(responseForGoal(judgment, 'understood'), 'understood');
  assert.equal(responseForGoal(reset, 'understood'), '');
});

test('feedback-order changes do not make an incompatible judgment valid', () => {
  const judgment = createLearnerJudgment('explore', 'none');
  assert.equal(responseForGoal(judgment, 'explore'), 'none');
  assert.equal(responseForGoal(judgment, 'understood'), '');
});

test('post-AI response replaces the current comparison while preserving the pre-AI judgment', () => {
  const preAi = createLearnerJudgment('explore', 'none');
  const state = { preAi, postAi: 'explore' };
  assert.equal(currentResponseForAttempt(state, 'explore'), 'explore');
  assert.equal(state.preAi.value, 'none');
});

test('a new attempt or goal clears the current response without changing the old record', () => {
  const previous = { preAi: createLearnerJudgment('explore', 'none'), postAi: 'explore' };
  const reset = { preAi: { goalId: '', value: '' }, postAi: '' };
  assert.equal(currentResponseForAttempt(previous, 'explore'), 'explore');
  assert.equal(currentResponseForAttempt(reset, 'explore'), '');
  assert.equal(currentResponseForAttempt(previous, 'understood'), '');
});
