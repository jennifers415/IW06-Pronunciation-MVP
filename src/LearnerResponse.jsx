import { useEffect, useRef, useState } from 'react';

export default function LearnerResponse({ word, errorType, canListen, onListen, onPractice, onFinish, onHearExample, intelligibilityConfirmed = false, finishLabel = 'Finish' }) {
  const [response, setResponse] = useState('');
  const [playbackError, setPlaybackError] = useState('');
  const headingRef = useRef(null);
  const previousResponseRef = useRef('');

  useEffect(() => {
    if (response !== previousResponseRef.current) headingRef.current?.focus();
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
  }

  function finishResponse() {
    if (response === 'practice') {
      onPractice();
      return;
    }
    onFinish(response === 'understandable');
  }

  function responseChoices() {
    return (
      <div className="response-choices" aria-label="Your response">
        <button className={response === 'practice' ? 'choice selected' : 'choice'} onClick={() => chooseResponse('practice')}>
          {response === 'practice' && <span aria-hidden="true">✓ </span>}I want to practice this
        </button>
        <button className={response === 'understandable' ? 'choice selected' : 'choice'} onClick={() => chooseResponse('understandable')}>
          {response === 'understandable' && <span aria-hidden="true">✓ </span>}I think I was understandable
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

  return (
    <section className="learner-response" aria-labelledby="learner-response-heading">
      <h2 id="learner-response-heading" ref={headingRef} tabIndex={-1}>
        {!response ? 'Your view of this recording'
          : response === 'understandable' ? 'Your view of this recording'
            : response === 'practice' ? 'You chose to practice this'
              : 'You don’t have to decide yet.'}
      </h2>
      {!response ? (
        <>
          {responseChoices()}
          <div className="actions"><button className="secondary" disabled>Finish</button></div>
        </>
      ) : (
        <>
          {responseChoices()}
          {response === 'understandable' && intelligibilityConfirmed
            ? <p>You chose to keep your pronunciation. The system returned your full intended sentence, and you felt your recording was understandable.</p>
            : response === 'understandable'
              ? <p>{evidence} This assessment does not directly measure whether another listener would understand you.</p>
              : response === 'practice'
                ? <p>You can make another recording and compare what the system notices.</p>
                : <p>{evidence} You can listen again or continue without resolving the question.</p>}
          {response === 'understandable' && intelligibilityConfirmed && <p className="hint">The system’s transcription does not guarantee that every listener would understand the recording the same way.</p>}
          <div className="response-choices">
            {response !== 'practice' && <button className="choice" onClick={listenAgain} disabled={!canListen}>Listen again</button>}
            {response === 'unsure' && <button className="choice" onClick={onHearExample}>Hear example</button>}
            {response === 'practice'
              ? <button className="primary" onClick={onPractice}>Try another recording</button>
              : <button className="choice" onClick={onPractice}>Try another recording</button>}
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
