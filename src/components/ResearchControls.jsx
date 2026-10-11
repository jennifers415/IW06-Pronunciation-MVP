import { useState } from 'react';
import RecommendationDemo from './RecommendationDemo.jsx';

export default function ResearchControls({ feedbackOrder, onFeedbackOrderChange, scenarioId, onScenarioChange, scenarios, busy, onRecommendationEvent }) {
  const [panel, setPanel] = useState('feedback');
  return (
    <aside className="research-controls" aria-label="Researcher controls">
      <details>
        <summary>Research controls</summary>
        <div className="research-view-switch" role="group" aria-label="Research tools">
          <button type="button" aria-pressed={panel === 'feedback'} aria-controls="research-feedback" onClick={() => setPanel('feedback')}>Feedback setup</button>
          <button type="button" aria-pressed={panel === 'recommendations'} aria-controls="research-recommendations" onClick={() => setPanel('recommendations')}>Recommendation demo</button>
        </div>
        <div id="research-feedback" hidden={panel !== 'feedback'}>
        <p>Live recordings use Azure. Feedback styles remain available internally for studio scenarios.</p>
        <label htmlFor="feedback-order">Feedback order</label>
        <select id="feedback-order" value={feedbackOrder} onChange={onFeedbackOrderChange}>
          <option value="ai-first">AI-first — model feedback before reflection</option>
          <option value="learner-first">Learner-first — reflection before model feedback</option>
        </select>
        <p>The order changes; both flows use the same assessment.</p>
        <label htmlFor="scenario">Studio scenario</label>
        <select id="scenario" value={scenarioId} onChange={onScenarioChange} disabled={busy}>
          <option value="">Live Azure assessment</option>
          {Object.entries(scenarios).map(([id, entry]) => <option key={id} value={id}>{entry.label} — simulated</option>)}
        </select>
        <p>Scenarios use fixed examples with no attached audio and make no Azure requests.</p>
        </div>
        <div id="research-recommendations" hidden={panel !== 'recommendations'}>
          <RecommendationDemo onEvent={onRecommendationEvent} />
        </div>
      </details>
    </aside>
  );
}
