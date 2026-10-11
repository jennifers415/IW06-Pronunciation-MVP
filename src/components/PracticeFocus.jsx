import { PRONUNCIATION_FEATURES } from '../../shared/phrases.js';
import { getPracticeRecommendations } from '../practiceRecommendations.js';
import SuggestedPhrases from './SuggestedPhrases.jsx';

export default function PracticeFocus({ sessionPhrases, choices, onManage, onPracticePhrase, showContext = true }) {
  const { focusId, phrases } = getPracticeRecommendations(sessionPhrases, choices);
  if (!showContext && !focusId) return null;
  return <aside className="practice-focus" aria-label="Current practice focus">
    {showContext && <><p><strong>Current focus:</strong> {focusId ? PRONUNCIATION_FEATURES[focusId].label : 'Your chosen learner goal — no saved sound focus.'}</p>
    <button className="action-link" onClick={onManage}>Manage in My Focus</button></>}
    {focusId && (onPracticePhrase
      ? <SuggestedPhrases key={focusId} phrases={phrases} focusId={focusId} onPracticePhrase={onPracticePhrase} />
      : <details><summary>Suggested phrases for this focus</summary><p className="hint">Finish your current session to start an optional phrase.</p><SuggestedPhrases key={focusId} phrases={phrases} focusId={focusId} /></details>)}
  </aside>;
}
