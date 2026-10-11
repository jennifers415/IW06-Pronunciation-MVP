import { useState } from 'react';
import { emptyRecommendationChoices, updateRecommendationChoices } from '../practiceRecommendations.js';

export default function useRecommendationChoices(onDecision) {
  const [choices, setChoices] = useState(emptyRecommendationChoices);
  function decide(decision) {
    if (updateRecommendationChoices(choices, decision) === choices) return;
    setChoices((previous) => updateRecommendationChoices(previous, decision));
    // Log at the interaction boundary, never inside a state updater or effect.
    onDecision?.(decision);
  }
  return { choices, decide, reset: () => setChoices(emptyRecommendationChoices()) };
}
