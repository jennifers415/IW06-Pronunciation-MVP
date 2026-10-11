import { PRONUNCIATION_FEATURES } from '../../shared/phrases.js';
import { RECURRING_PATTERN_ATTEMPTS, summarizePronunciationObservations } from '../../shared/pronunciationPatterns.js';

export default function PronunciationPatterns({ sessionPhrases, headingId = 'pronunciation-patterns-heading' }) {
  const attempts = sessionPhrases.flatMap((phrase) => phrase.attempts);
  const history = summarizePronunciationObservations(attempts.flatMap((attempt) => attempt.pronunciationObservations || []));
  const recurring = history.features.filter((feature) => feature.isRecurring);

  return (
    <section className="attempt-comparison pronunciation-patterns" aria-labelledby={headingId}>
      <h2 id={headingId}>Recurring pronunciation observations</h2>
      <p className="hint">Possible patterns inferred from AI observations in this session, not confirmed facts about your pronunciation. Word-level model matches cannot tell us which sound caused a difference, or whether a listener would understand you.</p>
      <p className="hint">You decide whether these observations matter to your goals. There is no need to change your pronunciation because a pattern appears here.</p>
      {recurring.length === 0 ? <p className="hint">No recurring patterns to show yet. A pattern needs supporting observations from at least {RECURRING_PATTERN_ATTEMPTS} distinct attempts. Limited or missing evidence does not establish that a pattern is present or absent.</p>
        : recurring.map((feature) => (
          <details className="attempt-card pattern-details" key={feature.featureId}>
            <summary>
              <strong>Possible pattern: {PRONUNCIATION_FEATURES[feature.featureId].label}</strong>
              <span className="hint">{feature.count} attempts · {feature.phraseIds.length} {feature.phraseIds.length === 1 ? 'phrase' : 'phrases'} · Expand for evidence</span>
            </summary>
            <p className="hint">These highlighted words contain this feature, but the AI did not assess the feature separately. One word can support several possible patterns; repeated attempts at one phrase are limited evidence.</p>
            <ul className="pattern-evidence">
              {history.observations.filter((observation) => observation.featureId === feature.featureId).map((observation) => {
                const phraseAttempts = attempts.filter((attempt) => attempt.phraseId === observation.phraseId);
                const index = phraseAttempts.findIndex((attempt) => attempt.id === observation.attemptId);
                const attempt = phraseAttempts[index];
                return <li key={`${observation.phraseId}-${observation.attemptId}-${observation.word}`}>
                  <p className="label">Attempt {index + 1} for this phrase · {observation.attemptId}</p>
                  <p>Phrase: “{attempt.referenceText}”</p>
                  <p>AI interpretation: “{attempt.assessment.recognizedText}”</p>
                  <p>AI highlighted “{observation.flaggedWord}” · Model match: {observation.accuracyScore} / 100</p>
                  <p className="hint">{observation.errorType === 'Mispronunciation'
                    ? 'AI observation: marked a lower pronunciation match with its reference.'
                    : 'AI observation: selected the lowest available word match, without marking a pronunciation issue.'}</p>
                </li>;
              })}
            </ul>
          </details>
        ))}
    </section>
  );
}
