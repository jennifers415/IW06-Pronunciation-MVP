import { referenceContainsWord } from '../../shared/assessment.js';
import RecordingPlayer from './RecordingPlayer.jsx';

export default function AttemptComparison({ attempts }) {
  if (attempts.length < 2) return null;
  return (
    <section className="attempt-comparison" aria-labelledby="attempt-comparison-heading">
      <p className="label">Your attempts</p>
      <h2 id="attempt-comparison-heading">Listen and compare</h2>
      <p className="hint">The model may have identified something different in each attempt. You can decide what changed.</p>
      <div className="attempt-grid">
        {attempts.map((attempt, index) => {
          const flagged = attempt.assessment?.flaggedWord;
          const inReference = referenceContainsWord(flagged?.word, attempt.referenceText);
          const labelId = `attempt-${attempt.id}-label`;
          return <article className="attempt-card" key={attempt.id}>
            <p className="label">Attempt {index + 1}</p>
            <RecordingPlayer src={attempt.recordingUrl} labelledBy={labelId} />
            <p id={labelId} className="attempt-finding">
              {flagged ? inReference
                ? <><span className="label">What the model noticed</span><strong>{flagged.word}</strong>{flagged.errorType && ` (${flagged.errorType})`}</>
                : <>The model returned <strong>{flagged.word}</strong>, which is outside this attempt’s reference sentence.</>
                : <><span className="label">What the model noticed</span>No word-level result</>}
            </p>
          </article>;
        })}
      </div>
    </section>
  );
}
