import { useId } from 'react';
import { formatWordScore } from '../../shared/assessment.js';
import { getPhrase } from '../../shared/phrases.js';
import PronunciationPatterns from './PronunciationPatterns.jsx';
import AttemptComparison from './AttemptComparison.jsx';
import RecordingPlayer from './RecordingPlayer.jsx';

export default function ProgressView({ sessionPhrases }) {
  const id = useId();
  const practiced = sessionPhrases.filter((phrase) => phrase.attempts.length > 0);
  return <section className="screen">
    <h1>My Progress</h1>
    <PronunciationPatterns sessionPhrases={sessionPhrases} headingId={`${id}-patterns`} />
    <h2>Attempt history</h2>
    <p className="hint">AI comparisons are observations, not confirmed errors or measures of your ability.</p>
    {practiced.length === 0 && <p>No attempts yet. Your assessed recordings will appear here.</p>}
    {practiced.map((phrase) => <details className="attempt-card pattern-details" key={phrase.phraseId}>
      <summary>{getPhrase(phrase.phraseId)?.text || phrase.phraseId} · {phrase.attempts.length} {phrase.attempts.length === 1 ? 'attempt' : 'attempts'}</summary>
      {phrase.attempts.map((attempt, index) => <details className="history-attempt" key={attempt.id}>
        <summary>Attempt {index + 1}{attempt.simulated ? ' · Simulated' : ''}</summary>
        <p className="label" id={`${id}-${attempt.id}`}>Recording · {attempt.id}</p>
        {attempt.recordingUrl ? <RecordingPlayer src={attempt.recordingUrl} labelledBy={`${id}-${attempt.id}`} /> : <p className="hint">No recording is attached.</p>}
        <p>AI interpretation: “{attempt.assessment?.recognizedText || 'No text returned'}”</p>
        {attempt.assessment?.flaggedWord && <p>AI highlighted “{attempt.assessment.flaggedWord.word}”. Model match: {formatWordScore(attempt.assessment.flaggedWord)} · AI label: {attempt.assessment.flaggedWord.errorType}.</p>}
      </details>)}
      <AttemptComparison attempts={phrase.attempts} />
    </details>)}
  </section>;
}
