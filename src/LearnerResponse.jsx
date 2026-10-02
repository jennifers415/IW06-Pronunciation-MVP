import { useEffect, useRef, useState } from 'react';

export default function LearnerResponse({ word, errorType, canListen, onListen, onPractice, onFinish, onHearExample, goal, intelligibilityConfirmed = false, finishLabel = 'Finish', initialOnly = false, initialResponse = '', onResponseChange }) {
  const [response, setResponse] = useState(initialResponse);
  const [playbackError, setPlaybackError] = useState('');
  const headingRef = useRef(null);
  const previousResponseRef = useRef('');

  useEffect(() => {
    if (response !== previousResponseRef.current) headingRef.current?.focus({ preventScroll: true });
    previousResponseRef.current = response;
  }, [response]);

  async function listenAgain() {
    setPlaybackError('');
    try {
      await onListen();
    } catch {
      setPlaybackError('Playback could not start. Use the recording controls above, or try another recording.');
    }
  }

  function chooseResponse(value) {
    setPlaybackError('');
    setResponse(value);
    onResponseChange?.(value);
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
    const firstChoice = understandingGoal ? 'understood' : exploringGoal ? 'explore' : exampleGoal ? 'example-practice' : 'practice';
    const secondChoice = understandingGoal ? 'unclear' : exploringGoal ? 'none' : exampleGoal ? 'example-satisfied' : 'understandable';
    return (
      <div className="response-choices" aria-label="Your response">
        <button className={response === firstChoice ? 'choice selected' : 'choice'} onClick={() => chooseResponse(firstChoice)}>
          {response === firstChoice && <span aria-hidden="true">✓ </span>}{understandingGoal ? 'I think my message came through' : exploringGoal ? 'I noticed a difference I want to explore' : exampleGoal ? 'I notice a difference I want to practice' : 'I want to practice this'}
        </button>
        <button className={response === secondChoice ? 'choice selected' : 'choice'} onClick={() => chooseResponse(secondChoice)}>
          {response === secondChoice && <span aria-hidden="true">✓ </span>}{understandingGoal ? 'I think something could have been unclear' : exploringGoal ? 'Nothing here stands out to me' : exampleGoal ? 'I’m satisfied with how this compares' : 'I think I was understandable'}
        </button>
        <button className={response === 'unsure' ? 'choice selected' : 'choice'} onClick={() => chooseResponse('unsure')}>
          {response === 'unsure' && <span aria-hidden="true">✓ </span>}I’m not sure
        </button>
      </div>
    );
  }

  const evidence = errorType === 'Mispronunciation'
    ? `The model found a lower pronunciation match for “${word}”.`
    : errorType === 'Omission' ? `The model may not have detected “${word}”.`
      : errorType === 'Insertion' ? `The model may have detected “${word}” as an extra word.`
        : word ? `The model selected “${word}” by its lowest available match, without marking a pronunciation issue.`
          : 'The model did not return a useful word-level assessment.';

  if (initialOnly) {
    return (
      <section className="learner-response learner-response-initial" aria-labelledby="learner-response-heading">
        <h2 id="learner-response-heading" ref={headingRef} tabIndex={-1}>What stands out to you?</h2>
        {responseChoices()}
      </section>
    );
  }

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
      {!response ? (
        <>
          {responseChoices()}
          <div className="actions"><button className="secondary" disabled>Finish</button></div>
        </>
      ) : (
        <>
          {responseChoices()}
          {intelligibilityConfirmed && goal === 'understood'
            ? <>
              <p className="label">What this can tell you</p>
              <p>{response === 'unclear'
                ? 'You noticed something that could have been unclear, so you can listen again or compare with an example.'
                : response === 'understandable' || response === 'understood'
                  ? 'You think your message came through in this recording.'
                  : 'You can decide what to make of that evidence.'}</p>
            </>
            : response === 'understandable'
              ? <p>{evidence} This assessment does not directly measure whether another listener would understand you.</p>
                : response === 'practice'
                ? <p>You can make another recording and compare what the system notices.</p>
                : response === 'example-practice'
                  ? <p>You noticed something you’d like to bring closer to the example. You can listen to both recordings again or try another recording.</p>
                : response === 'example-satisfied'
                  ? <p>You’re satisfied with this attempt. You can continue even if the model’s comparison is not identical to the example.</p>
                : response === 'explore'
                  ? <p>You noticed something you’d like to explore. You can listen again or compare it with the example.</p>
                : response === 'none'
                    ? <p>Nothing stood out to you in this recording. You can continue or inspect the model’s comparisons if you’re curious.</p>
                : response === 'unsure' && goal === 'explore'
                  ? <p>You don’t have to decide yet. You can listen again, compare with the example, or continue.</p>
                : <p>{evidence} You can listen again or continue without resolving the question.</p>}
          <div className="response-choices">
            {response !== 'practice' && <button className="choice" onClick={listenAgain} disabled={!canListen}>Listen again</button>}
            {(response === 'unsure' || response === 'unclear') && <button className="choice" onClick={onHearExample}>Hear example</button>}
            {response === 'practice'
              ? <button className="primary" onClick={onPractice}>Practice again</button>
              : response === 'explore'
                ? <button className="choice" onClick={onPractice}>Try another recording</button>
                : response === 'example-practice'
                  ? <button className="choice retry-action" onClick={onPractice}>Try another recording</button>
              : <button className="choice" onClick={onPractice}>{goal === 'understood' ? 'Practice again' : 'Try another recording'}</button>}
            {response !== 'practice' && <button className="primary" onClick={finishResponse}>{finishLabel}</button>}
          </div>
          {!canListen && <p className="label">No recording is attached to this studio scenario.</p>}
          {playbackError && <p className="error" role="alert">{playbackError}</p>}
          <button className="explanation-toggle" onClick={() => { setResponse(''); setPlaybackError(''); }}>Change my response</button>
        </>
      )}
    </section>
  );
}
