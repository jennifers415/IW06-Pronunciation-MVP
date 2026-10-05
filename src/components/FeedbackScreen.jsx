import LearnerResponse from '../LearnerResponse.jsx';
import { referenceContainsWord } from '../../shared/assessment.js';
import AttemptComparison from './AttemptComparison.jsx';
import PronunciationExample from './PronunciationExample.jsx';
import RecordingPlayer from './RecordingPlayer.jsx';

export default function FeedbackScreen({
  activeAssessment, scenario, goal, goalLabel, learnerFirstWaiting, feedbackRecordingUrl,
  feedbackReferenceText, feedbackAudioRef, returnedText, returnedTextHasWords, fullTranscriptMatch,
  substantialMismatch, explorationHasNoSpecificIssue, exampleHasNoSpecificIssue,
  intelligibilityHasNoSpecificIssue, hasUsefulWord, flaggedWord, showWordScore, reflectiveLabel, reflectiveContext, directMessage, expanded,
  onToggleExpanded, condition, learnerFirstResponse, onListen, onHearExample, onResponseChange,
  onInitialResponse, onAction, onPractice, onFinish, finishLabel, currentPhraseAttempts, scenarioId,
}) {
  return (
    <>
      {goalLabel && <p className="goal-context">Your focus: {goalLabel}</p>}
      <div className={`feedback-content${condition !== 'A' ? ' reflective-content' : ''}${substantialMismatch ? ' feedback-mismatch' : ''}`}>
        {learnerFirstWaiting ? <div className="exploration-first-pass">
          <p className="label">Listen to your recording</p>
          {feedbackRecordingUrl ? <RecordingPlayer key={feedbackRecordingUrl} src={feedbackRecordingUrl} labelledBy="exploration-recording-label" playerRef={feedbackAudioRef} />
            : <p className="hint">Your recording is unavailable.</p>}
          <p id="exploration-recording-label" className="hint">Listen once before viewing the model’s comparison.</p>
          {goal === 'example' && <div className="exploration-reference-example">
            <p className="label">One pronunciation example</p>
            <PronunciationExample word={feedbackReferenceText} />
          </div>}
          <LearnerResponse goal={goal} canListen={Boolean(feedbackRecordingUrl)} initialOnly onListen={onListen} onResponseChange={onInitialResponse} />
        </div> : <>
          {goal === 'understood' && condition !== 'C' && returnedText && <div className="goal-evidence">
            <p className="label">What the system heard</p>
            <p className="returned-text-label"><q>{returnedText}</q></p>
          </div>}
          {condition === 'C' && <div className="transcript-feedback">
            <p className="label">What the system heard</p>
            {!returnedTextHasWords && <p className="transcript-warning">The model returned almost no recognizable text.</p>}
            <p className="returned-text-label">Returned text: <q>{returnedText || 'No transcript was returned.'}</q></p>
            <p className="label">You intended to say</p>
            <blockquote>“{feedbackReferenceText}”</blockquote>
            <p>{!returnedText ? 'There is no returned text to compare.' : fullTranscriptMatch ? 'The system returned the full intended sentence.' : 'The system did not return the full intended sentence.'}</p>
            {!returnedText || !fullTranscriptMatch ? <p className="hint">This does not necessarily mean a listener would have had the same difficulty.</p> : null}
          </div>}
          {substantialMismatch ? (
            <div className="mismatch-message" role="status">
              <h2>The recording didn’t closely match the practice sentence</h2>
              <p>The system couldn’t reliably align this recording with:</p>
              <blockquote>“{feedbackReferenceText}”</blockquote>
              <p className="hint">Because the recording and practice sentence differed substantially, individual word feedback may not be meaningful.</p>
            </div>
          ) : explorationHasNoSpecificIssue ? (
            <div className="exploration-state" role="status">
              <p className="match-context">The model did not flag a specific pronunciation issue in this recording.</p>
              <p className="hint">If you’re curious, you can inspect how individual words matched its pronunciation reference.</p>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="exploration-details" onClick={onToggleExpanded}>View word comparisons <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="exploration-details" className="explanation" hidden={!expanded}>
                {(activeAssessment?.words || []).filter((word) => referenceContainsWord(word.word, feedbackReferenceText)).map((word, index) => <p key={`${word.word}-${index}`}><strong>{word.word}</strong> · {Number.isFinite(word.accuracyScore) ? `${word.accuracyScore} / 100` : 'No score'}{word.errorType && word.errorType !== 'None' ? ` · ${word.errorType}` : ''}</p>)}
              </div>
            </div>
          ) : exampleHasNoSpecificIssue ? (
            <div className="exploration-state" role="status">
              <p className="match-context">The model did not flag a specific pronunciation difference to focus on in this recording.</p>
              <p className="hint">If you’re curious, you can inspect how individual words compared with the example.</p>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="example-details" onClick={onToggleExpanded}>View word comparisons <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="example-details" className="explanation" hidden={!expanded}>
                {(activeAssessment?.words || []).filter((word) => referenceContainsWord(word.word, feedbackReferenceText)).map((word, index) => <p key={`${word.word}-${index}`}><strong>{word.word}</strong> · {Number.isFinite(word.accuracyScore) ? `${word.accuracyScore} / 100` : 'No score'}{word.errorType && word.errorType !== 'None' ? ` · ${word.errorType}` : ''}</p>)}
              </div>
            </div>
          ) : !hasUsefulWord ? (
            substantialMismatch ? <p className="match-context" role="status">The recording did not align closely enough with the practice sentence to provide reliable word-level pronunciation feedback. Listen to what the system heard, then try another recording if useful.</p>
              : intelligibilityHasNoSpecificIssue ? <div className="goal-interpretation" role="status"><p className="label">What this can tell you</p><p>The system recognized the intended sentence.</p><p className="hint">The system’s transcription does not guarantee that every listener would understand the recording the same way.</p></div>
                : <p className="match-context" role="status">I couldn’t make a reliable word-level assessment. Try another recording.</p>
          ) : <>
            {condition !== 'A' && <p className="label">{reflectiveLabel}</p>}
            <h2 className="word">{flaggedWord.word}</h2>
            {condition !== 'A' ? <>
              <p className="match-context">{reflectiveContext}</p>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="flag-explanation" onClick={onToggleExpanded}>{condition === 'C' ? 'Explore why' : showWordScore ? 'View model match details' : 'Why isn’t a score shown?'} <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="flag-explanation" className="explanation" hidden={!expanded}>
                {showWordScore && <dl className="model-match-score"><div><dt>Model match score</dt><dd>{flaggedWord.accuracyScore} / 100</dd></div></dl>}
                {condition === 'C' && <p>The model was given the practice sentence as its reference. Returned text is not independent evidence that a listener understood you.</p>}
                <p>{showWordScore ? 'This score reflects how closely the recording matched the pronunciation model’s reference. It does not directly measure whether another listener would understand you.' : 'The model reported a missing or extra word. A number here could confuse word matching with pronunciation, so it is not shown.'}</p>
              </div>
            </> : <><p>{directMessage}</p>{showWordScore && <p className="score">Score: <strong>{flaggedWord.accuracyScore}%</strong></p>}</>}
          </>}
        </>}
      </div>
      <div className={`feedback-comparison${goal === 'example' ? ' example-focused' : ''}${learnerFirstWaiting ? ' exploration-hidden' : ''}`}>
        <div className="comparison-item"><p className="label" id="feedback-recording-label">Your recording</p>{feedbackRecordingUrl && !scenario ? <RecordingPlayer key={feedbackRecordingUrl} src={feedbackRecordingUrl} labelledBy="feedback-recording-label" playerRef={feedbackAudioRef} /> : <p className="hint">{scenario ? 'No recording is attached to this simulated assessment.' : 'Your recording is unavailable.'}</p>}</div>
        {goal === 'example' && <div className="comparison-item"><p className="label">One pronunciation example</p><PronunciationExample key={`${scenarioId}-${condition}-${flaggedWord?.word || feedbackReferenceText}`} word={flaggedWord?.word || feedbackReferenceText} /></div>}
        <div className="comparison-item comparison-sentence"><p className="label">Sentence practiced</p><blockquote>“{feedbackReferenceText}”</blockquote></div>
      </div>
      {!learnerFirstWaiting && <LearnerResponse
        key={`${condition}-${scenarioId}-${learnerFirstResponse}`} word={hasUsefulWord ? flaggedWord.word : ''} errorType={hasUsefulWord ? flaggedWord.errorType : ''}
        canListen={Boolean(feedbackRecordingUrl && !scenario)} goal={goal} initialResponse={learnerFirstResponse} recordingMismatch={substantialMismatch}
        onListen={onListen} onHearExample={onHearExample} onResponseChange={onResponseChange} onAction={onAction} onPractice={onPractice} onFinish={onFinish} finishLabel={finishLabel}
      />}
      {!scenario && !learnerFirstWaiting && <AttemptComparison attempts={currentPhraseAttempts.slice(-2)} />}
    </>
  );
}
