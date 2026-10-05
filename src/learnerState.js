export const GOAL_RESPONSE_VALUES = Object.freeze({
  understood: Object.freeze(['understood', 'unclear', 'unsure']),
  explore: Object.freeze(['explore', 'none', 'unsure']),
  example: Object.freeze(['example-satisfied', 'example-practice', 'unsure']),
});

export function createLearnerJudgment(goalId, value) {
  return isValidLearnerResponse(goalId, value)
    ? { goalId, value }
    : { goalId: '', value: '' };
}

export function isValidLearnerResponse(goalId, value) {
  return Boolean(GOAL_RESPONSE_VALUES[goalId]?.includes(value));
}

export function responseForGoal(judgment, goalId) {
  return judgment?.goalId === goalId && isValidLearnerResponse(goalId, judgment.value)
    ? judgment.value
    : '';
}

export function currentResponseForAttempt({ preAi, postAi }, goalId) {
  const post = responseForGoal({ goalId, value: postAi }, goalId);
  return post || responseForGoal(preAi, goalId);
}
