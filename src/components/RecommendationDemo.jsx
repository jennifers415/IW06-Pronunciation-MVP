import { useState } from 'react';
import { getPhrase } from '../../shared/phrases.js';
import { LEARNER_GOALS } from '../learnerGoals.js';
import { SIMULATED_PRACTICE_HISTORIES } from '../simulatedPracticeHistories.js';
import useRecommendationChoices from '../hooks/useRecommendationChoices.js';
import PracticeRecommendations from './PracticeRecommendations.jsx';
import LearnerViews from './LearnerViews.jsx';
import ProgressView from './ProgressView.jsx';
import PracticeFocus from './PracticeFocus.jsx';
import ContextSidebar from './ContextSidebar.jsx';

export default function RecommendationDemo({ onEvent }) {
  const [historyId, setHistoryId] = useState('');
  const [goal, setGoal] = useState('explore');
  const [message, setMessage] = useState('');
  const [view, setView] = useState('focus');
  const { choices, decide, reset } = useRecommendationChoices((decision) => {
    setMessage('');
    onEvent({ ...decision, simulated: true, historyId, goal });
  });
  const history = SIMULATED_PRACTICE_HISTORIES[historyId];
  return <div className="recommendation-demo">
    <label htmlFor="practice-history">Simulated practice history</label>
    <select id="practice-history" value={historyId} onChange={(event) => { setHistoryId(event.target.value); setMessage(''); setView('focus'); }}>
      <option value="">No history demo</option>
      {Object.entries(SIMULATED_PRACTICE_HISTORIES).map(([id, entry]) => <option key={id} value={id}>{entry.label}</option>)}
    </select>
    {history && <>
      <p className="scenario-notice"><strong>Simulated history — no audio or Azure requests.</strong> Demo decisions and evidence stay separate from your live practice. Switching histories keeps your demo choices.</p>
      <details className="demo-settings">
      <summary>Demo settings and reset</summary>
      <label htmlFor="demo-goal">Demo learner goal</label>
      <select id="demo-goal" value={goal} onChange={(event) => setGoal(event.target.value)}>{LEARNER_GOALS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <button className="secondary" onClick={() => { reset(); setMessage('Demo choices reset.'); setView('focus'); }}>Reset demo choices</button>
      </details>
      <LearnerViews view={view} onViewChange={setView}
        sidebar={<ContextSidebar stage={view === 'practice' ? 'practice' : view === 'focus' ? 'complete' : 'feedback'} goal={goal} choices={choices} sessionPhrases={history.sessionPhrases} showObservations view={view} onViewChange={setView} simulated />}
        practice={<section className="screen"><h2>Practice · simulated</h2>
          <p className="hint">Choose a focus in My Focus, then select a phrase here. No recording or Azure request will start.</p>
          <PracticeFocus showContext={false} sessionPhrases={history.sessionPhrases} choices={choices} onManage={() => setView('focus')} onPracticePhrase={(phraseId, featureId) => {
            setMessage(`Simulated practice selected: “${getPhrase(phraseId).text}” No recording was started.`);
            onEvent({ action: 'practice', featureId, phraseId, simulated: true, historyId, goal });
          }} />
          {message && <p role="status">{message}</p>}
        </section>}
        progress={<ProgressView sessionPhrases={history.sessionPhrases} />}
        focus={<section className="screen"><h2>My Focus · simulated</h2>
          <PracticeRecommendations sessionPhrases={history.sessionPhrases} choices={choices} onDecision={decide} goal={goal} showPhrases={false} />
          <button className="action-link" onClick={() => setView('practice')}>Go to Practice</button>
        </section>} />
    </>}
  </div>;
}
