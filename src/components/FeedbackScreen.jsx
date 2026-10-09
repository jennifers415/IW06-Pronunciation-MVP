import LearnerResponse from '../LearnerResponse.jsx';
import { hasUsableWordScore, referenceContainsWord } from '../../shared/assessment.js';
import AttemptComparison from './AttemptComparison.jsx';
import PronunciationExample from './PronunciationExample.jsx';
import RecordingPlayer from './RecordingPlayer.jsx';

function modelScoreLabel(word) {
  return hasUsableWordScore(word)
    ? `Model match score: ${word.accuracyScore} / 100`
    : 'Model match score: Not available';
}

export default function FeedbackScreen({
  activeAssessment, scenario, goal, goalLabel, learnerFirstWaiting, feedbackRecordingUrl,
  feedbackReferenceText, feedbackAudioRef, returnedText, returnedTextHasWords, fullTranscriptMatch,
  substantialMismatch, explorationHasNoSpecificIssue, exampleHasNoSpecificIssue,
  intelligibilityHasNoSpecificIssue, hasUsefulWord, flaggedWord, showWordScore, reflectiveLabel, reflectiveContext, directMessage, expanded,
  signalsConflict, learnerResponseConflicts, challengeAvailable,
  explorationSignalsConflict, exampleSignalsConflict, conflictWord, requirePracticeReason,
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
          <p id="exploration-recording-label" className="hint">Listen once before viewing the AI listener’s comparison.</p>
          {goal === 'example' && <div className="exploration-reference-example">
            <p className="label">One pronunciation example</p>
            <PronunciationExample word={feedbackReferenceText} />
          </div>}
          <LearnerResponse goal={goal} canListen={Boolean(feedbackRecordingUrl)} initialOnly onListen={onListen} onResponseChange={onInitialResponse} />
        </div> : <>
          <div className="listener-interpretation">
            <p className="label">Intended phrase</p>
            <blockquote>“{feedbackReferenceText}”</blockquote>
            <p className="label">AI interpretation</p>
            <p className="returned-text-label"><q>{returnedText || 'The AI listener returned no recognizable text.'}</q></p>
            {returnedText && !fullTranscriptMatch && <p className="listener-mismatch">The AI listener’s interpretation differs from the intended phrase.</p>}
          </div>
          {(signalsConflict || explorationSignalsConflict || exampleSignalsConflict) && <div className="signal-conflict" role="status">
            <strong>These signals don't tell the same story.</strong>
            <p>{explorationSignalsConflict
              ? `The AI listener returned a substantially different interpretation while its pronunciation assessment singled out “${conflictWord?.word || 'one word'}”. Because the listener may not have reliably interpreted the sentence, this word-level comparison may not be meaningful.`
              : exampleSignalsConflict
                ? `The AI listener returned a substantially different interpretation while its pronunciation assessment singled out “${conflictWord?.word || 'one word'}”. Because the listener may not have reliably interpreted the sentence, this comparison with the pronunciation example may not be meaningful.`
                : 'The AI listener returned a different interpretation while its pronunciation assessment highlighted only one word.'}</p>
            {(explorationSignalsConflict || exampleSignalsConflict) && conflictWord && <>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="explore-conflict-details" onClick={onToggleExpanded}>View model match details <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="explore-conflict-details" className="explanation" hidden={!expanded}>
                <p><strong>{conflictWord.word}</strong> · {modelScoreLabel(conflictWord)}{conflictWord.errorType && conflictWord.errorType !== 'None' ? ` · ${conflictWord.errorType}` : ''}</p>
              </div>
            </>}
          </div>}
          {condition === 'C' && <div className="transcript-feedback">
            <p className="label">What the AI listener heard</p>
            {!returnedTextHasWords && <p className="transcript-warning">The AI listener returned almost no recognizable text.</p>}
            <p className="returned-text-label">Returned text: <q>{returnedText || 'No transcript was returned.'}</q></p>
            <p className="label">You intended to say</p>
            <blockquote>“{feedbackReferenceText}”</blockquote>
            <p>{!returnedText ? 'There is no returned text to compare.' : fullTranscriptMatch ? 'The AI listener returned the full intended sentence.' : 'The AI listener did not return the full intended sentence.'}</p>
            {!returnedText || !fullTranscriptMatch ? <p className="hint">This does not necessarily mean a listener would have had the same difficulty.</p> : null}
          </div>}
          {substantialMismatch ? (
            <div className="mismatch-message" role="status">
              <h2>The AI listener didn’t closely match the practice sentence</h2>
              <p>The AI listener couldn’t reliably align this recording with:</p>
              <blockquote>“{feedbackReferenceText}”</blockquote>
              <p className="hint">Because the AI interpretation and intended phrase differed substantially, individual word feedback may not be meaningful.</p>
            </div>
          ) : explorationSignalsConflict || exampleSignalsConflict ? null : explorationHasNoSpecificIssue ? (
            <div className="exploration-state" role="status">
              <p className="match-context">The AI listener did not flag a specific pronunciation difference in this recording.</p>
              <p className="hint">If you’re curious, you can inspect how individual words matched its pronunciation reference.</p>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="exploration-details" onClick={onToggleExpanded}>View word comparisons <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="exploration-details" className="explanation" hidden={!expanded}>
                {(activeAssessment?.words || []).filter((word) => referenceContainsWord(word.word, feedbackReferenceText)).map((word, index) => <p key={`${word.word}-${index}`}><strong>{word.word}</strong> · {modelScoreLabel(word)}{word.errorType && word.errorType !== 'None' ? ` · ${word.errorType}` : ''}</p>)}
              </div>
            </div>
          ) : exampleHasNoSpecificIssue ? (
            <div className="exploration-state" role="status">
              <p className="match-context">The AI listener did not flag a specific pronunciation difference to focus on in this recording.</p>
              <p className="hint">If you’re curious, you can inspect how individual words compared with the example.</p>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="example-details" onClick={onToggleExpanded}>View word comparisons <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="example-details" className="explanation" hidden={!expanded}>
                {(activeAssessment?.words || []).filter((word) => referenceContainsWord(word.word, feedbackReferenceText)).map((word, index) => <p key={`${word.word}-${index}`}><strong>{word.word}</strong> · {modelScoreLabel(word)}{word.errorType && word.errorType !== 'None' ? ` · ${word.errorType}` : ''}</p>)}
              </div>
            </div>
          ) : !hasUsefulWord ? (
            substantialMismatch ? <p className="match-context" role="status">The AI listener did not align closely enough with the practice sentence to provide reliable word-level pronunciation feedback. Listen to its interpretation, then test the listener again if useful.</p>
              : intelligibilityHasNoSpecificIssue ? <div className="goal-interpretation" role="status"><p className="label">What this can tell you</p><p>The AI listener recognized the intended sentence.</p><p className="hint">The AI listener’s transcription does not guarantee that every listener would understand the recording the same way.</p></div>
                : <p className="match-context" role="status">I couldn’t make a reliable word-level assessment. Try another recording.</p>
          ) : <>
            {condition !== 'A' && <p className="label">{reflectiveLabel}</p>}
            <h2 className="word">{flaggedWord.word}</h2>
            {condition !== 'A' ? <>
              <p className="match-context">{reflectiveContext}</p>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="flag-explanation" onClick={onToggleExpanded}>{condition === 'C' ? 'Explore why' : showWordScore ? 'View model match details' : 'Why isn’t a score shown?'} <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="flag-explanation" className="explanation" hidden={!expanded}>
                {showWordScore && <dl className="model-match-score"><div><dt>Model match score</dt><dd>{flaggedWord.accuracyScore} / 100</dd></div></dl>}
                {condition === 'C' && <p>The AI listener was given the practice sentence as its reference. Its returned text is not independent evidence that a human listener understood you.</p>}
                <p>{showWordScore ? 'This AI assessment reflects how closely the recording matched its pronunciation reference. It does not directly measure whether another listener would understand you.' : 'The AI listener reported a missing or extra word. A number here could confuse word matching with pronunciation, so it is not shown.'}</p>
              </div>
            </> : <><p>{directMessage}</p>{showWordScore && <>
              <button className="explanation-toggle" aria-expanded={expanded} aria-controls="direct-score-details" onClick={onToggleExpanded}>View model match details <span aria-hidden="true">{expanded ? '▴' : '▾'}</span></button>
              <div id="direct-score-details" className="explanation" hidden={!expanded}>
                <dl className="model-match-score"><div><dt>Model match score</dt><dd>{flaggedWord.accuracyScore} / 100</dd></div></dl>
                <p>This AI assessment reflects how closely the recording matched its pronunciation reference. It does not directly measure whether another listener would understand you.</p>
              </div>
            </>}</>}
          </>}
        </>}
      </div>
      <div className={`feedback-comparison${goal === 'example' ? ' example-focused' : ''}${learnerFirstWaiting ? ' exploration-hidden' : ''}`}>
        <div className="recording-review">
          <div className="comparison-item recording-comparison"><p className="label" id="feedback-recording-label">Listen to your recording</p>{feedbackRecordingUrl && !scenario ? <RecordingPlayer key={feedbackRecordingUrl} src={feedbackRecordingUrl} labelledBy="feedback-recording-label" playerRef={feedbackAudioRef} /> : <p className="hint">{scenario ? 'No recording is attached to this simulated assessment.' : 'Your recording is unavailable.'}</p>}</div>
        </div>
        {goal === 'example' && <div className="comparison-item example-comparison"><p className="label">One pronunciation example</p><PronunciationExample key={`${scenarioId}-${condition}-${flaggedWord?.word || feedbackReferenceText}`} word={flaggedWord?.word || feedbackReferenceText} /></div>}
      </div>
      {!learnerFirstWaiting && <LearnerResponse
        key={`${condition}-${scenarioId}-${learnerFirstResponse}`} word={hasUsefulWord ? flaggedWord.word : ['explore', 'example'].includes(goal) ? conflictWord?.word || '' : ''} errorType={hasUsefulWord ? flaggedWord.errorType : conflictWord?.errorType || ''}
        canListen={Boolean(feedbackRecordingUrl && !scenario)} goal={goal} initialResponse={learnerFirstResponse} recordingMismatch={substantialMismatch || explorationSignalsConflict || exampleSignalsConflict}
        onListen={onListen} onHearExample={onHearExample} onResponseChange={onResponseChange} onAction={onAction} onPractice={onPractice} onFinish={onFinish} finishLabel={finishLabel}
        aiDisagreement={learnerResponseConflicts} challengeAvailable={challengeAvailable} requirePracticeReason={requirePracticeReason}
      />}
      {!scenario && !learnerFirstWaiting && <AttemptComparison attempts={currentPhraseAttempts.slice(-2)} />}
    </>
  );
}
