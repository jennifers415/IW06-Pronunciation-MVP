import { useId, useState } from 'react';
import { PRONUNCIATION_FEATURES } from '../../shared/phrases.js';
import SuggestedPhrases from './SuggestedPhrases.jsx';
import { getPracticeRecommendations } from '../practiceRecommendations.js';

const goalReasons = {
  understood: 'If being understood is your goal, another recording could help you compare what the AI heard with what you intended. A lower model match does not establish that people have difficulty understanding you.',
  explore: 'If you want to explore your pronunciation, these phrases offer another way to listen and compare without deciding that anything needs changing.',
  example: 'If you want to practice toward an example, these phrases offer a way to compare recordings with that reference. Matching it is your choice.',
};

function RedirectChoice({ featureId, onDecision }) {
  const [targetId, setTargetId] = useState('');
  const id = useId();
  return <details className="recommendation-redirect">
    <summary>Choose a different focus</summary>
    <label htmlFor={id}>What would you rather explore?</label>
    <select id={id} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
      <option value="">Choose a focus</option>
      {Object.entries(PRONUNCIATION_FEATURES).filter(([key]) => key !== featureId).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
    </select>
    <p className="hint">This is your choice, not an AI finding about this sound. Explicitly choosing a previously dismissed focus makes it available again.</p>
    <button className="secondary" disabled={!targetId} onClick={() => onDecision({ action: 'redirect', featureId, targetId })}>Use my chosen focus</button>
  </details>;
}

export default function PracticeRecommendations({ sessionPhrases, choices, onDecision, goal, onPracticePhrase, showPhrases = true }) {
  const headingId = useId();
  const { suggestion, focusId, phrases, hasRecurring } = getPracticeRecommendations(sessionPhrases, choices);
  const featureId = focusId || suggestion?.featureId;
  return <section className="attempt-comparison practice-recommendations" data-focus-state={focusId ? 'saved' : 'suggested'} aria-labelledby={headingId}>
    <h2 id={headingId}>Optional practice recommendations</h2>
    <p className="hint">Choices last until page reload. Dismissed focuses stay hidden unless you choose them again.</p>
    {!featureId ? <p role="status">{hasRecurring ? 'No more suggestions based on your current choices. You can continue your usual practice.' : 'There is not enough recurring evidence for a recommendation yet.'}</p> : <div className="attempt-card">
      <p className="label">{focusId ? 'Your saved practice focus' : 'A possible focus to consider'}</p>
      <h3>{PRONUNCIATION_FEATURES[featureId].label}</h3>
      {suggestion && <>
        <p>The AI highlighted words containing this feature in {suggestion.count} distinct attempts across {suggestion.phraseIds.length} {suggestion.phraseIds.length === 1 ? 'phrase' : 'phrases'}: {suggestion.flaggedWords.join(', ')}.</p>
        <p className="hint">This is a possible pattern, not a confirmed sound error. The model assessed whole words, so it cannot establish which sound caused a lower match. Supporting evidence is available in the recurring observations.</p>
      </>}
      <details className="recommendation-explanation"><summary>Why this might be useful</summary><p>{goalReasons[goal] || 'Another phrase can give you something to listen to and compare. You decide whether this focus is useful.'}</p></details>
      {focusId ? <>
        <p role="status">You chose this focus. Nothing has been assigned automatically.</p>
        <p className="hint">{!showPhrases ? 'Your suggested phrases are in Practice. Optional practice is available after finishing your current session.' : onPracticePhrase ? 'Choose a phrase when you want to start optional practice.' : 'Suggested phrases are saved here. You can start optional practice from the session summary after finishing your current session.'}</p>
        {showPhrases && <SuggestedPhrases key={focusId} phrases={phrases} focusId={focusId} onPracticePhrase={onPracticePhrase} />}
      </> : <button className="primary" onClick={() => onDecision({ action: 'accept', featureId })}>Accept — save this focus</button>}
      <button className="action-link" onClick={() => onDecision({ action: 'reject', featureId })}>{focusId ? 'Remove and don’t suggest this focus' : 'Reject — don’t suggest this focus'}</button>
      <RedirectChoice key={featureId} featureId={featureId} onDecision={onDecision} />
    </div>}
  </section>;
}
