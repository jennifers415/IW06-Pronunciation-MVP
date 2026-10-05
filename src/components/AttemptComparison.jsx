import { useState } from 'react';
import { formatWordScore, referenceContainsWord } from '../../shared/assessment.js';
import RecordingPlayer from './RecordingPlayer.jsx';

export default function AttemptComparison({ attempts }) {
  const [showAttempts, setShowAttempts] = useState(false);
  const [showComparisons, setShowComparisons] = useState(false);
  if (attempts.length < 2) return null;

  const alignedAttempts = attempts.filter((attempt) => attempt.assessment?.alignment?.substantialMismatch !== true);
  const referenceAttempt = alignedAttempts[0];
  const referenceWords = (referenceAttempt?.assessment?.words || [])
    .filter((word) => referenceContainsWord(word.word, referenceAttempt.referenceText));
  const comparisonRows = referenceWords.map((word) => ({
    word: word.word,
    values: attempts.map((attempt) => attempt.assessment?.alignment?.substantialMismatch === true
      ? null
      : (attempt.assessment?.words || []).find((candidate) => (
        candidate.word?.toLocaleLowerCase() === word.word?.toLocaleLowerCase()
      )) || null),
  }));

  return (
    <section className="attempt-comparison" aria-labelledby="attempt-comparison-heading">
      <p className="label">Your attempts</p>
      <p className="attempt-count">{attempts.length} recordings</p>
      <button
        className="explanation-toggle attempt-toggle"
        aria-expanded={showAttempts}
        aria-controls="attempt-details"
        onClick={() => setShowAttempts((visible) => !visible)}
      >
        {showAttempts ? 'Hide attempt comparison' : 'Compare attempts'}
        <span aria-hidden="true">{showAttempts ? '▴' : '▾'}</span>
      </button>
      <div id="attempt-details" hidden={!showAttempts}>
        <h2 id="attempt-comparison-heading">Listen and compare</h2>
        <p className="hint">Listen to your recordings side by side. You may notice differences between attempts even when the model does not flag an issue.</p>
        <div className="attempt-grid">
        {attempts.map((attempt, index) => {
          const labelId = `attempt-${attempt.id}-label`;
          return <article className="attempt-card" key={attempt.id}>
            <p className="label">Attempt {index + 1}</p>
            <RecordingPlayer src={attempt.recordingUrl} labelledBy={labelId} />
            <span id={labelId} className="sr-only">Attempt {index + 1} recording</span>
            {attempt.assessment?.alignment?.substantialMismatch === true && <p className="attempt-alignment-note">The model couldn’t reliably align this recording with the practice sentence, so word-level comparisons aren’t available.</p>}
          </article>;
        })}
        </div>
        {comparisonRows.length > 0 && <>
        <button
          className="explanation-toggle attempt-comparison-toggle"
          aria-expanded={showComparisons}
          aria-controls="attempt-word-comparisons"
          onClick={() => setShowComparisons((visible) => !visible)}
        >
          View detailed model scores
          <span aria-hidden="true">{showComparisons ? '▴' : '▾'}</span>
        </button>
        <div id="attempt-word-comparisons" className="attempt-word-comparisons" hidden={!showComparisons}>
          <p className="hint">These are comparisons with the model’s reference. You can decide whether any difference matters to you.</p>
          <div className="comparison-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Word</th>
                  {attempts.map((attempt, index) => <th scope="col" key={attempt.id}>Attempt {index + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(({ word, values }) => <tr key={word}>
                  <th scope="row">{word}</th>
                  {values.map((value, index) => <td key={`${word}-${attempts[index].id}`}>
                    {formatWordScore(value)}
                    {typeof value?.errorType === 'string' && !['none', 'unknown', 'unavailable'].includes(value.errorType.toLocaleLowerCase()) ? <span className="comparison-error"> · {value.errorType}</span> : null}
                  </td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
        </>}
      </div>
    </section>
  );
}
