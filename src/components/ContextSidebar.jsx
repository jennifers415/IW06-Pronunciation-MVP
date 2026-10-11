import { LEARNER_GOALS } from '../learnerGoals.js';
import { PRONUNCIATION_FEATURES } from '../../shared/phrases.js';
import { summarizePronunciationObservations } from '../../shared/pronunciationPatterns.js';
import { getPracticeRecommendations } from '../practiceRecommendations.js';

const reflectionLabels = {
  understood: 'I think my message came through', unclear: 'I think something could have been unclear',
  explore: 'Something stands out to me', none: 'Nothing stands out to me',
  'example-satisfied': 'They sound fairly similar', 'example-practice': 'I notice some differences', unsure: 'I’m not sure',
};

export default function ContextSidebar({ goal, choices, sessionPhrases, stage = 'goal', referenceText = '', learnerResponse = '', showObservations = false, reflectionPending = false, view, onViewChange, busy = false, simulated = false }) {
  const goalLabel = LEARNER_GOALS.find((item) => item.id === goal)?.label;
  const focusLabel = PRONUNCIATION_FEATURES[choices.focusId]?.label;
  const currentStage = reflectionPending ? 'reflection' : stage;
  const attempts = sessionPhrases.flatMap((phrase) => phrase.attempts);
  // Stage and timing guards apply before rendering any AI-derived content.
  const canShowAi = showObservations && !reflectionPending && ['feedback', 'complete'].includes(currentStage);
  const recent = canShowAi ? attempts.filter((attempt) => attempt.pronunciationObservations?.length)
    .sort((a, b) => (b.assessedAt || '').localeCompare(a.assessedAt || '')).slice(0, 2) : [];
  const patterns = canShowAi ? summarizePronunciationObservations(attempts.flatMap((attempt) => attempt.pronunciationObservations || [])).features.filter((feature) => feature.isRecurring) : [];
  const recommendation = canShowAi && currentStage === 'complete' ? getPracticeRecommendations(sessionPhrases, choices).suggestion : null;
  const manageFocus = view !== 'focus' && <button className="action-link" disabled={busy} onClick={() => onViewChange('focus')}>Manage in My Focus</button>;

  return <>
    <h2>{({ goal: 'Before you begin', practice: 'While you practice', reflection: 'Your reflection', feedback: 'Alongside the feedback', complete: 'What’s next?' })[currentStage]}{simulated ? ' · simulated' : ''}</h2>
    {currentStage === 'goal' ? <>
      <section className="context-section"><h3>Saved practice focus</h3><p>{focusLabel || 'No saved focus.'}</p>{manageFocus}</section>
      <section className="context-section"><h3>Learning history</h3><p>{attempts.length ? `${attempts.length} attempts across ${sessionPhrases.filter((phrase) => phrase.attempts.length).length} phrases this session.` : 'No attempts yet.'}</p></section>
    </> : <>
      <section className="context-section"><h3>Learner goal</h3><p>{goalLabel || 'No goal selected.'}</p></section>
      {currentStage === 'practice' && <section className="context-section"><h3>Intended phrase</h3><p>{referenceText ? `“${referenceText}”` : 'Choose a phrase to practice.'}</p></section>}
      {currentStage === 'reflection' && <section className="context-section"><h3>Your observations</h3><p>{reflectionLabels[learnerResponse] || 'No reflection selected yet.'}</p><p className="hint">AI feedback stays hidden until you reflect.</p></section>}
      {currentStage === 'feedback' && <section className="context-section">
        <h3>Supporting observations</h3>
        {!recent.length ? <p>No observations yet.</p> : <>
          <p className="hint">AI observations, not confirmed errors.</p>
          <ul className="context-observations">{recent.map((attempt) => <li key={attempt.id}><p>AI highlighted “{attempt.pronunciationObservations[0].flaggedWord}”.</p><p className="hint">“{attempt.referenceText}”</p></li>)}</ul>
          <details><summary>Patterns and limitations</summary>
            <p className="hint">Word-level matches cannot identify which sound caused a difference.</p>
            {patterns.length ? <ul>{patterns.map((pattern) => <li key={pattern.featureId}>{PRONUNCIATION_FEATURES[pattern.featureId].label} · {pattern.count} attempts</li>)}</ul> : <p>No recurring patterns yet.</p>}
          </details>
          {view !== 'progress' && <button className="action-link" disabled={busy} onClick={() => onViewChange('progress')}>Inspect in My Progress</button>}
        </>}
      </section>}
      {currentStage === 'complete' && <section className="context-section">
        <h3>{focusLabel ? 'Your saved focus' : 'Optional next step'}</h3>
        {focusLabel ? <p>{focusLabel} — chosen by you.</p> : recommendation ? <>
          <p>Consider exploring {PRONUNCIATION_FEATURES[recommendation.featureId].label}.</p>
          <p className="hint">Observed across {recommendation.count} attempts, not a confirmed sound error. You decide whether it matters.</p>
        </> : <p>No new recommendation.</p>}
        {manageFocus}
      </section>}
    </>}
  </>;
}
