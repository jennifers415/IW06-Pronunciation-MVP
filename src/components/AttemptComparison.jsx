import { useState } from 'react';
import { referenceContainsWord } from '../../shared/assessment.js';
import RecordingPlayer from './RecordingPlayer.jsx';

export default function AttemptComparison({ attempts }) {
  const [showComparisons, setShowComparisons] = useState(false);
  if (attempts.length < 2) return null;

  const referenceWords = (attempts[0].assessment?.words || [])
    .filter((word) => referenceContainsWord(word.word, attempts[0].referenceText));
  const comparisonRows = referenceWords.map((word) => ({
    word: word.word,
    values: attempts.map((attempt) => (attempt.assessment?.words || []).find((candidate) => (
      candidate.word?.toLocaleLowerCase() === word.word?.toLocaleLowerCase()
    )) || null),
  }));

  return (
    <section className="attempt-comparison" aria-labelledby="attempt-comparison-heading">
      <p className="label">Your attempts</p>
      <h2 id="attempt-comparison-heading">Listen and compare</h2>
      <p className="hint">Listen to your recordings side by side. You may notice differences between attempts even when the model does not flag an issue.</p>
      <div className="attempt-grid">
        {attempts.map((attempt, index) => {
          const labelId = `attempt-${attempt.id}-label`;
          return <article className="attempt-card" key={attempt.id}>
            <p className="label">Attempt {index + 1}</p>
            <RecordingPlayer src={attempt.recordingUrl} labelledBy={labelId} />
            <span id={labelId} className="sr-only">Attempt {index + 1} recording</span>
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
          View model comparisons across attempts
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
                    {Number.isFinite(value?.accuracyScore) ? `${value.accuracyScore} / 100` : 'No score'}
                    {value?.errorType && value.errorType !== 'None' ? <span className="comparison-error"> · {value.errorType}</span> : null}
                  </td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </>}
    </section>
  );
}
