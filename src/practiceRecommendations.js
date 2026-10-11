import { PHRASES, PRONUNCIATION_FEATURES } from '../shared/phrases.js';
import { summarizePronunciationObservations } from '../shared/pronunciationPatterns.js';

export function emptyRecommendationChoices() {
  return { decisions: {}, focusId: '' };
}

// A dismissal remains in force even when new evidence arrives. Redirecting is
// a learner-selected focus, not an inference that another sound is a problem.
export function updateRecommendationChoices(choices, { action, featureId, targetId }) {
  if (!Object.hasOwn(PRONUNCIATION_FEATURES, featureId)) return choices;
  if (!['accept', 'reject', 'redirect'].includes(action)) return choices;
  if (action === 'redirect' && (!Object.hasOwn(PRONUNCIATION_FEATURES, targetId) || targetId === featureId)) return choices;
  return {
    decisions: {
      ...choices.decisions,
      [featureId]: action,
      ...(action === 'redirect' ? { [targetId]: 'accept' } : {}),
    },
    focusId: action === 'accept' ? featureId : action === 'redirect' ? targetId
      : choices.focusId === featureId ? '' : choices.focusId,
  };
}

export function getPracticeRecommendations(sessionPhrases, choices) {
  const history = summarizePronunciationObservations(sessionPhrases.flatMap((phrase) =>
    phrase.attempts.flatMap((attempt) => attempt.pronunciationObservations || [])));
  const recurring = history.features.filter((feature) => feature.isRecurring);
  const focusId = choices.focusId;
  return {
    // Once a learner chooses a focus, don't compete with it using more prompts.
    suggestion: focusId ? null : recurring.find((feature) => !choices.decisions[feature.featureId]) || null,
    focusId,
    phrases: focusId ? PHRASES.filter((phrase) => phrase.pronunciationFeatures.some((feature) => feature.featureId === focusId)) : [],
    hasRecurring: recurring.length > 0,
  };
}
