import { useEffect, useRef, useState } from 'react';

export default function LearnerResponse({ word, errorType, canListen, onListen, onPractice, onFinish, onHearExample, goal, finishLabel = 'Finish', initialOnly = false, initialResponse = '', onResponseChange, onAction, recordingMismatch = false }) {
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
    onAction?.('listen-again');
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
      </div>
    );
  }

  const evidence = recordingMismatch ? 'The model couldn’t reliably compare this recording with the practice sentence.'
    : errorType === 'Mispronunciation'
    ? `The model found a lower pronunciation match for “${word}”.`
    : errorType === 'Omission' ? `The model may not have detected “${word}”.`
      : errorType === 'Insertion' ? `The model may have detected “${word}” as an extra word.`
        : word ? `The model selected “${word}” by its lowest available match, without marking a pronunciation issue.`
          : 'The model did not identify a specific word to highlight.';

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
              : response === 'unsure' ? 'I’m not sure' : '';

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
          <div className="perspective-summary">
            <p className="label">Your view</p>
            <p>“{responseLabel}”</p>
            <p className="label">What the model noticed</p>
            <p>{evidence}</p>
          </div>
          <p className="hint response-guidance">{response === 'practice' || response === 'example-practice' || response === 'explore'
            ? 'Listen again or try another recording.'
            : response === 'unsure'
              ? 'Listen again, inspect the available evidence, or continue.'
              : 'You can listen again, practice again, or continue.'}</p>
          <div className="response-choices">
            {response !== 'practice' && <button className="choice" onClick={listenAgain} disabled={!canListen}>Listen again</button>}
            {(response === 'unsure' || response === 'unclear') && goal !== 'understood' && <button className="choice" onClick={onHearExample}>Hear example</button>}
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
