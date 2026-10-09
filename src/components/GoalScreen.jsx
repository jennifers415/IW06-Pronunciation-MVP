import { LEARNER_GOALS } from '../learnerGoals.js';

export default function GoalScreen({ selectedGoal, onSelectGoal, onContinue }) {
  return (
    <div className="goal-selection">
      <p className="goal-introduction">Test how this AI listener interprets your speech. Speak naturally; you do not need to change how you speak for the system.</p>
      <div className="goal-options" role="radiogroup" aria-label="Learner goal">
        {LEARNER_GOALS.map((goal) => (
          <button
            key={goal.id}
            className={`goal-option${selectedGoal === goal.id ? ' selected' : ''}`}
            role="radio"
            aria-checked={selectedGoal === goal.id}
            onClick={() => onSelectGoal(goal.id)}
          >
            <span className="goal-option-label">{selectedGoal === goal.id && <span aria-hidden="true">✓ </span>}{goal.label}</span>
            <span className="goal-option-description">{goal.description}</span>
          </button>
        ))}
      </div>
      <div className="actions"><button className="primary full-width" disabled={!selectedGoal} onClick={onContinue}>Continue</button></div>
    </div>
  );
}
