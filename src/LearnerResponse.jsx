import { useEffect, useRef, useState } from 'react';

export default function LearnerResponse({ word, errorType, canListen, onListen, onPractice, onFinish, onHearExample, onChallenge, goal, finishLabel = 'Finish', initialOnly = false, initialResponse = '', onResponseChange, onAction, recordingMismatch = false, aiDisagreement = false, challengeAvailable = true, requirePracticeReason = true }) {
  const [response, setResponse] = useState(initialResponse);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeResponse, setChallengeResponse] = useState('');
  const [practiceReason, setPracticeReason] = useState('');
  const [editingResponse, setEditingResponse] = useState(false);
  const [compactAfterEdit, setCompactAfterEdit] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const headingRef = useRef(null);
  const previousResponseRef = useRef('');

  useEffect(() => {
    if (response !== previousResponseRef.current) headingRef.current?.focus({ preventScroll: true });
    previousResponseRef.current = response;
  }, [response]);

  async function listenAgain() {
    setPlaybackError('');
    onAction?.('listen-again');
    try {
      await onListen();
    } catch {
      setPlaybackError('Playback could not start. Use the recording controls above, or try another recording.');
    }
  }

  function chooseResponse(value) {
    setPlaybackError('');
    setChallengeOpen(false);
    setChallengeResponse('');
    setPracticeReason('');
    setResponse(value);
    setEditingResponse(false);
    onResponseChange?.(value);
  }

  function chooseChallenge(value) {
    setChallengeResponse(value);
    setChallengeOpen(false);
    onChallenge?.(value);
  }

  function finishResponse() {
    if (response === 'practice') {
      onPractice();
      return;
    }
    onFinish(response === 'understandable' || response === 'understood' || response === 'example-satisfied');
  }

  function responseChoices() {
    const understandingGoal = goal === 'understood';
    const exploringGoal = goal === 'explore';
    const exampleGoal = goal === 'example';
    const firstChoice = understandingGoal ? 'understood' : exploringGoal ? 'explore' : exampleGoal ? (initialOnly ? 'example-satisfied' : 'example-practice') : 'practice';
    const secondChoice = understandingGoal ? 'unclear' : exploringGoal ? 'none' : exampleGoal ? (initialOnly ? 'example-practice' : 'example-satisfied') : 'understandable';
    return (
      <div className="response-choices" aria-label="Your response">
        <button className={response === firstChoice ? 'choice selected' : 'choice'} onClick={() => chooseResponse(firstChoice)}>
          {response === firstChoice && <span aria-hidden="true">✓ </span>}{understandingGoal ? 'I think my message came through' : exploringGoal ? (initialOnly ? 'Something stands out to me' : 'I noticed a difference I want to explore') : exampleGoal ? (initialOnly ? 'They sound fairly similar' : 'I notice a difference I want to practice') : 'I want to practice this'}
        </button>
        <button className={response === secondChoice ? 'choice selected' : 'choice'} onClick={() => chooseResponse(secondChoice)}>
          {response === secondChoice && <span aria-hidden="true">✓ </span>}{understandingGoal ? 'I think something could have been unclear' : exploringGoal ? (initialOnly ? 'Nothing stands out to me' : 'Nothing here stands out to me') : exampleGoal ? (initialOnly ? 'I notice some differences' : 'I’m satisfied with how this compares') : 'I think I was understandable'}
        </button>
        <button className={response === 'unsure' ? 'choice selected' : 'choice'} onClick={() => chooseResponse('unsure')}>
          {response === 'unsure' && <span aria-hidden="true">✓ </span>}I’m not sure
        </button>
        {!initialOnly && <button className={response === 'ai-misunderstood' ? 'choice selected' : 'choice'} onClick={() => chooseResponse('ai-misunderstood')}>
          {response === 'ai-misunderstood' && <span aria-hidden="true">✓ </span>}I think the AI misunderstood me
        </button>}
      </div>
    );
  }

  const evidence = recordingMismatch && word ? `AI evidence: The pronunciation assessment singled out “${word}”, but the AI interpretation differed substantially from the intended phrase, so this ${goal === 'example' ? 'comparison with the pronunciation example' : 'word-level result'} may not be meaningful.`
    : recordingMismatch ? 'The AI listener couldn’t reliably compare this recording with the practice sentence.'
    : errorType === 'Mispronunciation'
    ? `The AI listener found a lower pronunciation match for “${word}”.`
    : errorType === 'Omission' ? `The AI listener may not have detected “${word}”.`
      : errorType === 'Insertion' ? `The AI listener may have detected “${word}” as an extra word.`
        : word ? `The AI listener selected “${word}” by its lowest available match, without marking a pronunciation issue.`
          : 'The AI listener did not identify a specific word to highlight.';

  if (initialOnly) {
    return (
      <section className="learner-response learner-response-initial" aria-labelledby="learner-response-heading">
        <h2 id="learner-response-heading" ref={headingRef} tabIndex={-1}>{goal === 'understood'
          ? 'Listen to your recording. Do you think your message came through?'
          : goal === 'example'
            ? 'Listen to your recording and the example. How similar do they sound to you?'
            : 'Listen to your recording. What stands out to you?'}</h2>
        {responseChoices()}
      </section>
    );
  }

  const responseLabel = response === 'understood' ? 'I think my message came through'
    : response === 'unclear' ? 'I think something could have been unclear'
      : response === 'explore' ? 'I noticed a difference I want to explore'
        : response === 'none' ? 'Nothing here stands out to me'
          : response === 'example-practice' ? 'I notice a difference I want to practice'
            : response === 'example-satisfied' ? 'I’m satisfied with how this compares'
    : response === 'unsure' ? 'I’m not sure'
      : response === 'ai-misunderstood' ? 'I think the AI misunderstood me' : '';
  const requiresPracticeReason = requirePracticeReason && ['practice', 'explore', 'example-practice'].includes(response);
  // Once a response is selected, keep the learner's view compact and revisable
  // across every goal. Initial learner-first reflection still uses the full list.
  const compactPresentation = Boolean(response) || compactAfterEdit;
  const showChallenge = response !== 'unsure' && !requiresPracticeReason
    && (response === 'ai-misunderstood' || challengeAvailable);

  return (
    <section className="learner-response" aria-labelledby="learner-response-heading">
      <h2 id="learner-response-heading" ref={headingRef} tabIndex={-1}>
        {!response ? (goal === 'explore' ? 'What stands out to you?' : 'Your view of this recording')
          : response === 'unsure' ? 'You don’t have to decide yet.'
          : response === 'understandable' || response === 'understood' || response === 'unclear' ? 'Your view of this recording'
          : response === 'practice' ? 'You chose to practice this'
          : response === 'example-practice' ? 'You noticed a difference to practice'
          : response === 'example-satisfied' ? 'You’re satisfied with this attempt'
              : response === 'explore' ? 'You noticed a difference to explore'
                : 'Your view of this recording'}
      </h2>
      {!response || editingResponse ? (
        <>
          {responseChoices()}
        </>
      ) : (
        <>
          {!compactPresentation && responseChoices()}
          {compactPresentation ? <div className="compact-response-summary">
            <p className="label">Your view</p>
            <p>“{responseLabel}”</p>
            <button className="explanation-toggle compact-change" onClick={() => { setEditingResponse(true); setCompactAfterEdit(true); setChallengeOpen(false); setChallengeResponse(''); setPracticeReason(''); setPlaybackError(''); }}>Change</button>
          </div> : <div className="perspective-summary">
            <p className="label">Your view</p>
            <p>“{responseLabel}”</p>
            <p className="label">AI interpretation</p>
            <p>{evidence}</p>
          </div>}
          {aiDisagreement && <div className="disagreement-note" role="status">
            <strong>You and the AI disagree.</strong>
            <p>Your view is “{responseLabel}.” The AI interpretation is: {evidence} You don't have to resolve this disagreement.</p>
          </div>}
          {showChallenge && <button className="secondary challenge-action" onClick={() => setChallengeOpen(!challengeOpen)} aria-expanded={challengeOpen}>Challenge AI assessment <span aria-hidden="true">{challengeOpen ? '▴' : '▾'}</span></button>}
          {challengeOpen && <div className="challenge-panel">
            <p className="label">What do you think happened?</p>
            {['understandable', 'intentional', 'misunderstood', 'unsure'].map((value) => <button key={value} className={challengeResponse === value ? 'choice selected' : 'choice'} onClick={() => chooseChallenge(value)}>
              {challengeResponse === value && <span aria-hidden="true">✓ </span>}{value === 'understandable' ? 'My pronunciation was understandable' : value === 'intentional' ? 'That’s how I intentionally pronounce it' : value === 'misunderstood' ? 'The AI misunderstood me' : 'Other / I’m not sure'}
            </button>)}
          </div>}
          {requiresPracticeReason && !practiceReason && <div className="practice-friction">
            <p className="label">Why do you want to change this pronunciation?</p>
            {['listener', 'personal', 'ai', 'unsure'].map((value) => <button key={value} className="choice" onClick={() => setPracticeReason(value)}>{value === 'listener' ? 'People sometimes have difficulty understanding me' : value === 'personal' ? 'I personally want to change how I pronounce it' : value === 'ai' ? 'The AI told me it was wrong' : 'I’m not sure'}</button>)}
          </div>}
          {requiresPracticeReason && practiceReason === 'ai' && <div className="practice-friction-note">
            {goal === 'explore' ? <><p>A lower model match isn’t the same as a pronunciation being wrong.</p><p>The model can tell you that your pronunciation differed from its reference. It cannot decide whether that difference needs to change.</p></>
              : goal === 'example' ? <><p>Different from the example doesn’t mean wrong.</p><p>This is one pronunciation example, not a rule for how you need to speak. The model can compare your recording with this reference, but it cannot decide whether matching it should be your goal.</p></>
              : <p>The system can tell you that your speech differed from the pronunciation model it was given. That alone does not determine whether your pronunciation needs to change.</p>}
          </div>}
          {compactPresentation ? (aiDisagreement ? <div className="compact-disagreement-actions">
            {canListen && <button className="action-link" onClick={listenAgain}>Listen again</button>}
            <button className="action-link" onClick={onPractice}>{recordingMismatch ? 'Try another recording' : 'Practice my pronunciation'}</button>
            <button className="primary" onClick={() => onFinish(response === 'understood')}>Continue without resolving it</button>
          </div> : (!requiresPracticeReason || practiceReason) && <div className={`compact-disagreement-actions${requiresPracticeReason ? ' practice-actions' : ''}`}>
            {!requiresPracticeReason && <button className="action-link" onClick={listenAgain} disabled={!canListen}>Listen again</button>}
            {requiresPracticeReason
              ? <><button className="primary" onClick={onPractice}>{goal === 'example' ? 'Practice toward the example anyway' : 'Practice anyway'}</button><button className="action-link" onClick={() => onFinish(false)}>{goal === 'example' ? 'Keep my pronunciation' : 'Keep my pronunciation and continue'}</button></>
              : <><button className="action-link" onClick={onPractice}>{goal === 'understood' ? 'Practice again' : 'Try another recording'}</button><button className="primary" onClick={finishResponse}>{finishLabel}</button></>}
          </div>) : (!requiresPracticeReason || practiceReason) && <div className="response-choices">
            {!requiresPracticeReason && <button className="action-link" onClick={listenAgain} disabled={!canListen}>Listen again</button>}
            {(response === 'unsure' || response === 'unclear') && goal !== 'understood' && <button className="action-link" onClick={onHearExample}>Hear example</button>}
            {requiresPracticeReason
              ? <><button className="primary" onClick={onPractice}>{goal === 'example' ? 'Practice toward the example anyway' : 'Practice anyway'}</button><button className="choice" onClick={() => onFinish(false)}>{goal === 'example' ? 'Keep my pronunciation' : 'Keep my pronunciation and continue'}</button></>
              : <button className="action-link" onClick={onPractice}>{aiDisagreement ? (goal === 'understood' ? 'Practice my pronunciation' : 'Try another recording') : goal === 'understood' ? 'Practice again' : 'Try another recording'}</button>}
            {!requiresPracticeReason && <button className="primary" onClick={finishResponse}>{aiDisagreement ? 'Continue without resolving it' : finishLabel}</button>}
          </div>}
          {!canListen && <p className="label">No recording is attached to this studio scenario.</p>}
          {playbackError && <p className="error" role="alert">{playbackError}</p>}
          {!compactPresentation && <button className="explanation-toggle" onClick={() => { setResponse(''); setChallengeOpen(false); setChallengeResponse(''); setPracticeReason(''); setPlaybackError(''); }}>Change my response</button>}
        </>
      )}
    </section>
  );
}
