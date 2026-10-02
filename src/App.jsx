import { useEffect, useRef, useState } from 'react';
import { recordingToWav } from './audio.js';
import { PHRASES, referenceContainsWord } from '../shared/assessment.js';
import LearnerResponse from './LearnerResponse.jsx';
import { SCENARIOS, transcriptMatchesReference } from './scenarios.js';
import AttemptComparison from './components/AttemptComparison.jsx';
import PronunciationExample from './components/PronunciationExample.jsx';
import RecordingPlayer from './components/RecordingPlayer.jsx';
import './App.css';

const LEARNER_GOALS = [
  { id: 'understood', label: 'Being easily understood', description: 'Focus on whether your intended message was understood.' },
  { id: 'explore', label: 'Exploring my pronunciation', description: 'Notice how your pronunciation compares with the example without setting a specific target.' },
  { id: 'example', label: 'Practicing toward an example', description: 'Practice making your pronunciation closer to an example.' },
];

function App() {
  const [screen, setScreen] = useState('goal');
  const [learnerGoal, setLearnerGoal] = useState(null);
  const [, setLearnerPreferences] = useState({});
  const [condition, setCondition] = useState('B');
  const [status, setStatus] = useState('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [scenarioId, setScenarioId] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [attempts, setAttempts] = useState([]);
  const [explorationResponse, setExplorationResponse] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [sessionPhrases, setSessionPhrases] = useState(() => PHRASES.map((phrase) => ({
    phraseId: phrase.id, attempts: [], finalDecision: null,
  })));
  const feedbackAudioRef = useRef(null);
  const recordingRef = useRef(null);
  const analysisRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const urlRef = useRef('');
  const requestRef = useRef(0);
  const attemptsRef = useRef([]);
  const sessionPhrasesRef = useRef(sessionPhrases);
  const currentPhrase = PHRASES[phraseIndex] || PHRASES[0];
  const referenceText = currentPhrase.text;
  const currentPhraseAttempts = attempts.filter((attempt) => attempt.phraseId === currentPhrase.id);
  const currentAttempt = currentPhraseAttempts.at(-1) || null;
  const feedbackReferenceText = currentAttempt?.referenceText || referenceText;
  const feedbackRecordingUrl = currentAttempt?.recordingUrl || audioUrl;
  const headingRef = useRef(null);
  const busy = ['requesting', 'recording', 'stopping', 'analyzing'].includes(status);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      analysisRef.current?.abort();
      analysisRef.current = null;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      attemptsRef.current.forEach((attempt) => URL.revokeObjectURL(attempt.recordingUrl));
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [screen]);

  function clearDraftRecording() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
    setAudioUrl('');
    recordingRef.current = null;
  }

  function setAttemptHistory(nextAttempts) {
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    const nextSession = sessionPhrasesRef.current.map((phrase, index) => index === phraseIndex
      ? { ...phrase, attempts: nextAttempts } : phrase);
    sessionPhrasesRef.current = nextSession;
    setSessionPhrases(nextSession);
  }

  function clearSession() {
    clearDraftRecording();
    attemptsRef.current.forEach((attempt) => URL.revokeObjectURL(attempt.recordingUrl));
    setAttemptHistory([]);
    const reset = PHRASES.map((phrase) => ({ phraseId: phrase.id, attempts: [], finalDecision: null }));
    sessionPhrasesRef.current = reset;
    setSessionPhrases(reset);
    setPhraseIndex(0);
    setAssessment(null);
    setExplorationResponse('');
  }

  function practiceAgain() {
    clearSession();
    setError('');
    setExpanded(false);
    setScenarioId('');
    setAttemptNumber(1);
    setStatus('idle');
    setLearnerGoal(null);
    setLearnerPreferences({});
    setScreen('goal');
  }

  function beginSession() {
    if (!learnerGoal) return;
    setScreen('practice');
  }

  function preferenceKey(word) {
    return word?.trim().toLocaleLowerCase() || '';
  }

  function rememberPreference(word, decision) {
    const key = preferenceKey(word);
    if (key) setLearnerPreferences((previous) => ({ ...previous, [key]: decision }));
  }

  function startAnotherAttempt() {
    const current = attemptsRef.current.at(-1);
    const currentWord = current?.assessment?.flaggedWord?.word || assessment?.flaggedWord?.word;
    rememberPreference(currentWord, 'practice');
    if (current) setAttemptHistory(attemptsRef.current.map((attempt) => attempt.id === current.id
      ? { ...attempt, learnerDecision: 'practice' } : attempt));
    clearDraftRecording();
    setError('');
    setExpanded(false);
    setAttemptNumber((number) => number + 1);
    setExplorationResponse('');
    setStatus('idle');
    setScreen('practice');
  }

  async function startRecording() {
    if (busy) return;
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Recording is unavailable here. Open this page over HTTPS or localhost in a browser that supports microphone recording.');
      return;
    }
    setStatus('requesting');
    const request = ++requestRef.current;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      // Negotiate the format instead of assuming every browser records WebM.
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      const chunks = [];
      let failed = false;
      recorder.ondataavailable = ({ data }) => {
        if (data.size > 0) chunks.push(data);
        if (import.meta.env.DEV) console.debug('[recording] MediaRecorder chunk', { size: data.size, type: data.type });
      };
      recorder.onerror = () => {
        failed = true;
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setError('Recording was interrupted. Please try recording again.');
        setStatus('idle');
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (request !== requestRef.current) return;
        streamRef.current = null;
        recorderRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || '' });
        if (import.meta.env.DEV) console.debug('[recording] MediaRecorder complete', { chunkCount: chunks.length, bytes: blob.size, type: blob.type });
        if (!failed && blob.size > 0) {
          setStatus('stopping');
          try {
            // Decode before enabling playback/feedback. WAV has sample-based duration,
            // unlike some streamed MediaRecorder containers with missing metadata.
            const wav = await recordingToWav(blob);
            if (request !== requestRef.current) return;
            clearDraftRecording();
            recordingRef.current = wav;
            if (import.meta.env.DEV) console.debug('[recording] WAV ready for analysis', { bytes: wav.size, type: wav.type });
            urlRef.current = URL.createObjectURL(wav);
            setAudioUrl(urlRef.current);
            setStatus('ready');
          } catch (err) {
            if (request !== requestRef.current) return;
            clearDraftRecording();
            setError(err.message || 'This recording could not be read. Please record again.');
            setStatus('idle');
          }
        } else {
          setError('No recording was saved. Please try recording again.');
          setStatus('idle');
        }
      };
      recorder.start(1000);
      clearDraftRecording();
      setStatus('recording');
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      if (request !== requestRef.current) return;
      streamRef.current = null;
      recorderRef.current = null;
      const messages = {
        NotAllowedError: 'Microphone access was not allowed. Allow it in your browser’s site settings, then try again.',
        NotFoundError: 'No microphone was found. Connect a microphone, then try again.',
        NotReadableError: 'Your microphone could not be opened. Check whether another app is using it, then try again.',
      };
      setError(messages[err.name] || 'Recording could not start. Check your microphone and try again.');
      setStatus('idle');
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      setStatus('stopping');
      recorder.stop();
    }
  }

  function changeCondition(event) {
    feedbackAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setCondition(event.target.value);
    setExpanded(false);
  }

  function changeScenario(event) {
    if (busy) return;
    feedbackAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    const id = event.target.value;
    setScenarioId(id);
    setExpanded(false);
    setError('');
    setScreen(id || assessment ? 'feedback' : 'practice');
  }

  function finishPractice(keep = false) {
    clearDraftRecording();
    const decision = keep === true ? 'understandable' : 'unsure';
    const current = attemptsRef.current.at(-1);
    const updatedAttempts = current
      ? attemptsRef.current.map((attempt) => attempt.id === current.id
        ? { ...attempt, learnerDecision: decision } : attempt)
      : attemptsRef.current;
    const updatedSession = sessionPhrasesRef.current.map((phrase, index) => index === phraseIndex
      ? { ...phrase, attempts: updatedAttempts, finalDecision: decision }
      : phrase);
    sessionPhrasesRef.current = updatedSession;
    setSessionPhrases(updatedSession);
    attemptsRef.current = updatedAttempts;
    setAttempts(updatedAttempts);
    setScenarioId('');
    if (phraseIndex < PHRASES.length - 1) {
      const nextIndex = phraseIndex + 1;
      setPhraseIndex(nextIndex);
      attemptsRef.current = [];
      setAttempts([]);
      setAssessment(null);
      setExplorationResponse('');
      setAttemptNumber(1);
      setStatus('idle');
      setScreen('practice');
      return;
    }
    setScreen('complete');
  }

  async function listenAgain() {
    const player = feedbackAudioRef.current;
    if (!player) throw new Error('No recording is available.');
    window.speechSynthesis?.cancel();
    player.currentTime = 0;
    player.focus();
    await player.play();
  }

  function hearExampleAgain() {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(flaggedWord?.word || feedbackReferenceText);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  async function getFeedback(recording = recordingRef.current) {
    if (busy || analysisRef.current) return;
    setError('');
    if (!recording?.size) {
      setError('Your recording is empty. Please record again.');
      return;
    }
    const controller = new AbortController();
    analysisRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    setStatus('analyzing');
    try {
      const wav = recording;
      controller.signal.throwIfAborted();
      const response = await fetch('/api/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav', 'X-Phrase-Id': currentPhrase.id },
        body: wav,
        signal: controller.signal,
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error('The assessment server is unavailable. Make sure npm run server is running, then try again.');
      }
      if (!response.ok) throw new Error(result.error || 'Assessment failed. Please try again.');
      if (typeof result.recognizedText !== 'string' || !Array.isArray(result.words)) {
        throw new Error('The assessment response was incomplete. Please try again.');
      }
      controller.signal.throwIfAborted();
      const attempt = {
        id: `${Date.now()}-${attemptNumber}`,
        phraseId: currentPhrase.id,
        recording: wav,
        recordingUrl: urlRef.current,
        assessment: result,
        referenceText,
        learnerDecision: null,
      };
      setAttemptHistory([...attemptsRef.current, attempt]);
      // The attempt now owns this URL; it must survive another recording.
      urlRef.current = '';
      setAssessment(result);
      setExplorationResponse('');
      setExpanded(false);
      setStatus('ready');
      setScreen('feedback');
    } catch (err) {
      if (analysisRef.current !== controller) return;
      setError(err.name === 'AbortError' ? 'Assessment took too long. Please try again.'
        : err instanceof TypeError ? 'Could not connect to the assessment server. Make sure npm run server is running and try again.'
          : err.message || 'Assessment failed. Please try again.');
      setStatus('ready');
    } finally {
      clearTimeout(timeout);
      if (analysisRef.current === controller) analysisRef.current = null;
    }
  }

  const scenario = SCENARIOS[scenarioId];
  // Live feedback is always derived from the attempt for this phrase. The
  // global assessment state is retained only for compatibility with studio
  // scenario switching and must not determine live phrase-specific UI.
  const activeAttemptAssessment = currentAttempt?.assessment || null;
  const activeAssessment = scenario?.result || activeAttemptAssessment;
  const candidateFlaggedWord = activeAssessment?.flaggedWord;
  const returnedText = activeAssessment?.recognizedText?.trim() || '';
  const fullTranscriptMatch = transcriptMatchesReference(returnedText, feedbackReferenceText);
  const explicitIssue = ['Mispronunciation', 'Omission', 'Insertion'].includes(candidateFlaggedWord?.errorType);
  const substantialMismatch = activeAssessment?.alignment?.substantialMismatch === true;
  const explorationWaiting = learnerGoal === 'explore' && !explorationResponse && !scenario;
  const intelligibilityHasNoSpecificIssue = learnerGoal === 'understood' && fullTranscriptMatch && !explicitIssue;
  const explorationHasNoSpecificIssue = learnerGoal === 'explore' && !explicitIssue;
  const flaggedWordMatchesReference = referenceContainsWord(candidateFlaggedWord?.word, feedbackReferenceText);
  const exampleHasSpecificIssue = learnerGoal === 'example' && !substantialMismatch && flaggedWordMatchesReference && explicitIssue;
  const exampleHasNoSpecificIssue = learnerGoal === 'example' && !exampleHasSpecificIssue;
  const flaggedWord = !intelligibilityHasNoSpecificIssue && !explorationHasNoSpecificIssue && !exampleHasNoSpecificIssue ? candidateFlaggedWord : null;
  const returnedTextHasWords = /[\p{L}\p{N}]/u.test(returnedText);
  const isMiscue = ['Omission', 'Insertion'].includes(flaggedWord?.errorType);
  
  // A miscue does not always mean the pronunciation was wrong.
  // A low or zero accuracy score does not mean the model is unsure.
  const showWordScore = flaggedWordMatchesReference && ['None', 'Mispronunciation'].includes(flaggedWord?.errorType)
    && Number.isFinite(flaggedWord?.accuracyScore)
    && flaggedWord.accuracyScore >= 0 && flaggedWord.accuracyScore <= 100;
  const hasUsefulWord = Boolean(!substantialMismatch && flaggedWord?.word && (isMiscue || showWordScore));
  const goalLabel = LEARNER_GOALS.find((goal) => goal.id === learnerGoal)?.label;
  const directMessage = !flaggedWordMatchesReference ? 'The model returned a word outside this practice sentence. Listen again before treating it as a pronunciation finding.'
    : flaggedWord?.errorType === 'Mispronunciation' ? 'Pronunciation needs improvement.'
    : flaggedWord?.errorType === 'Omission' ? 'The model may not have detected this word. Listen again before drawing a conclusion.'
      : flaggedWord?.errorType === 'Insertion' ? 'The model may have detected an extra word. Listen again before drawing a conclusion.'
        : 'Lowest available model match. This comparison alone does not identify a pronunciation problem.';
  const reflectiveLabel = !flaggedWordMatchesReference ? 'Word returned outside the practice sentence'
    : learnerGoal === 'explore' ? 'A pronunciation difference the model noticed'
    : learnerGoal === 'example' ? 'A difference from the example'
    : flaggedWord?.errorType === 'Mispronunciation' ? 'Word the model had difficulty matching'
    : flaggedWord?.errorType === 'Omission' ? 'The assessment may have missed:'
      : flaggedWord?.errorType === 'Insertion' ? 'The assessment detected an extra word:'
        : 'Word with the lowest match';

  const reflectiveContext = !flaggedWordMatchesReference
    ? 'The returned word does not belong to this attempt’s reference sentence. That may reflect an alignment problem or an unusual model result.'
    : flaggedWord?.errorType === 'Omission'
    ? 'The model may not have detected this word. That does not establish that you left it out; listen again and decide.'
    : flaggedWord?.errorType === 'Insertion'
      ? 'The model matched a word outside the practice sentence. You can listen again and decide what to make of it.'
      : flaggedWord?.errorType === 'Mispronunciation'
        ? 'The model marked a lower match with its pronunciation reference. That alone does not mean a listener would misunderstand it.'
        : 'This word had the lowest available match, but the model did not mark a pronunciation issue. You can decide whether it needs more practice.';

  const title = screen === 'goal'
    ? 'What would you like to focus on?'
    : screen === 'practice'
    ? 'Pronunciation Practice'
    : screen === 'complete'
      ? 'Practice complete.'
      : condition === 'C' ? 'What the system heard'
        : learnerGoal === 'explore' && explorationWaiting ? 'Listen to your recording'
        : condition === 'B' ? 'Here’s what the model noticed' : 'Pronunciation Feedback';

  return (
    <div className="app-shell">
      <aside className="research-controls" aria-label="Researcher controls">
        <details>
        <summary>Research controls</summary>
        <label htmlFor="condition">Feedback styles</label>
        <select id="condition" value={condition} onChange={changeCondition}>
          <option value="A">A — Direct scoring</option>
          <option value="B">B — Reflective feedback</option>
          <option value="C">C — Intelligibility-oriented</option>
        </select>
        <p>All styles present the same assessment. Live recordings use Azure.</p>
        {screen === 'feedback' && <p>Switch styles to compare without analyzing again.</p>}
        <label htmlFor="scenario">Studio scenario</label>
        <select id="scenario" value={scenarioId} onChange={changeScenario} disabled={busy}>
          <option value="">Live Azure assessment</option>
          {Object.entries(SCENARIOS).map(([id, entry]) => <option key={id} value={id}>{entry.label} — simulated</option>)}
        </select>
        <p>Scenarios use fixed examples with no attached audio and make no Azure requests.</p>
        </details>
      </aside>

      <main className="practice-panel">
        <section className={`screen screen-${screen}`} aria-labelledby="screen-title">
          <p className="eyebrow">{screen === 'goal' ? 'Before practice' : screen === 'practice' ? `${phraseIndex + 1} / ${PHRASES.length} Practice · Attempt ${attemptNumber}` : screen === 'feedback' ? `${phraseIndex + 1} / ${PHRASES.length} Feedback` : 'Session finished'}</p>
          <h1 id="screen-title" ref={headingRef} tabIndex={-1}>{title}</h1>
          {screen === 'feedback' && scenario && <aside className="scenario-notice" aria-label="Simulated studio assessment">
            <p><strong>Studio scenario: {scenario.label} — simulated</strong></p>
            <p>This is fixed example feedback, not an assessment of your recording. {scenario.prompt}</p>
          </aside>}

          {screen === 'goal' && (
            <div className="goal-selection">
              <div className="goal-options" role="radiogroup" aria-label="Learner goal">
                {LEARNER_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    className={`goal-option${learnerGoal === goal.id ? ' selected' : ''}`}
                    role="radio"
                    aria-checked={learnerGoal === goal.id}
                    onClick={() => setLearnerGoal(goal.id)}
                  >
                    <span className="goal-option-label">{learnerGoal === goal.id && <span aria-hidden="true">✓ </span>}{goal.label}</span>
                    <span className="goal-option-description">{goal.description}</span>
                  </button>
                ))}
              </div>
              <div className="actions"><button className="primary full-width" disabled={!learnerGoal} onClick={beginSession}>Continue</button></div>
            </div>
          )}

          {screen === 'practice' && (
            <>
              <div className="sentence-block">
                <p className="label">Practice this sentence</p>
                <blockquote>“{referenceText}”</blockquote>
              </div>
              <p className="hint">Read the sentence aloud when you’re ready. Keep your recording under 30 seconds.</p>
              <p className="recording-status" data-status={status} role="status">
                {status === 'recording' && <span className="recording-dot" aria-hidden="true" />}
                {status === 'analyzing' ? 'Analyzing pronunciation…' : status === 'requesting' ? 'Waiting for microphone access…' : status === 'recording' ? 'Recording…' : status === 'stopping' ? 'Saving your recording…' : audioUrl ? 'Recording ready.' : ''}
              </p>
              {audioUrl && !busy && (
                <div className="playback">
                  <p id="recording-label" className="label">Your recording</p>
                  <RecordingPlayer key={audioUrl} src={audioUrl} labelledBy="recording-label" />
                </div>
              )}
              {error && <p className="error" role="alert">{error}</p>}
              <div className="actions stacked">
                {status === 'recording' ? (
                  <button className="primary" onClick={stopRecording}>Stop recording</button>
                ) : busy ? (
                  <button className="primary" disabled>{status === 'analyzing' ? 'Analyzing pronunciation…' : status === 'requesting' ? 'Opening microphone…' : 'Saving…'}</button>
                ) : audioUrl ? (
                  <>
                    <button className="primary" onClick={() => getFeedback(recordingRef.current)}>Analyze pronunciation</button>
                    <button className="secondary" onClick={startRecording}>Record again</button>
                  </>
                ) : (
                  <button className="primary" onClick={startRecording}>Start recording</button>
                )}
              </div>
              <p className="privacy-note">Analyze pronunciation sends your recording to Microsoft Azure. This app does not save recordings on the server.</p>
            </>
          )}

          {screen === 'feedback' && activeAssessment && (
            <>
              {goalLabel && <p className="goal-context">Your focus: {goalLabel}</p>}
              <div className={`feedback-content${condition !== 'A' ? ' reflective-content' : ''}${substantialMismatch ? ' feedback-mismatch' : ''}`}>
                {explorationWaiting ? <div className="exploration-first-pass">
                  <p className="label">Listen to your recording</p>
                  {feedbackRecordingUrl ? <RecordingPlayer key={feedbackRecordingUrl} src={feedbackRecordingUrl} labelledBy="exploration-recording-label" playerRef={feedbackAudioRef} />
                    : <p className="hint">Your recording is unavailable.</p>}
                  <p id="exploration-recording-label" className="hint">Listen once before viewing the model’s comparison.</p>
                  <LearnerResponse
                    goal="explore"
                    canListen={Boolean(feedbackRecordingUrl)}
                    initialOnly
                    onListen={listenAgain}
                    onResponseChange={setExplorationResponse}
                  />
                </div> : <>
                {learnerGoal === 'understood' && condition !== 'C' && returnedText && <div className="goal-evidence">
                  <p className="label">What the system heard</p>
                  <p className="returned-text-label"><q>{returnedText}</q></p>
                </div>}
                {condition === 'C' && <div className="transcript-feedback">
                  <p className="label">What the system heard</p>
                  {!returnedTextHasWords && <p className="transcript-warning">The model returned almost no recognizable text.</p>}
                  <p className="returned-text-label">Returned text: <q>{returnedText || 'No transcript was returned.'}</q></p>
                  <p className="label">You intended to say</p>
                  <blockquote>“{feedbackReferenceText}”</blockquote>
                  <p>{!returnedText ? 'There is no returned text to compare.'
                    : fullTranscriptMatch
                      ? 'The system returned the full intended sentence.'
                      : 'The system did not return the full intended sentence.'}</p>
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
                    <button className="explanation-toggle" aria-expanded={expanded} aria-controls="exploration-details" onClick={() => setExpanded(!expanded)}>
                      View word comparisons <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
                    </button>
                    <div id="exploration-details" className="explanation" hidden={!expanded}>
                      {(activeAssessment?.words || []).filter((word) => referenceContainsWord(word.word, feedbackReferenceText)).map((word) => (
                        <p key={word.word}><strong>{word.word}</strong> · {Number.isFinite(word.accuracyScore) ? `${word.accuracyScore} / 100` : 'No score'}{word.errorType && word.errorType !== 'None' ? ` · ${word.errorType}` : ''}</p>
                      ))}
                    </div>
                  </div>
                ) : exampleHasNoSpecificIssue ? (
                  <div className="exploration-state" role="status">
                    <p className="match-context">The model did not flag a specific pronunciation difference to focus on in this recording.</p>
                    <p className="hint">If you’re curious, you can inspect how individual words compared with the example.</p>
                    <button className="explanation-toggle" aria-expanded={expanded} aria-controls="example-details" onClick={() => setExpanded(!expanded)}>
                      View word comparisons <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
                    </button>
                    <div id="example-details" className="explanation" hidden={!expanded}>
                      {(activeAssessment?.words || []).filter((word) => referenceContainsWord(word.word, feedbackReferenceText)).map((word) => (
                        <p key={word.word}><strong>{word.word}</strong> · {Number.isFinite(word.accuracyScore) ? String(word.accuracyScore) + ' / 100' : 'No score'}{word.errorType && word.errorType !== 'None' ? ' · ' + word.errorType : ''}</p>
                      ))}
                    </div>
                  </div>
                ) : !hasUsefulWord ? (
                  substantialMismatch ? <p className="match-context" role="status">The recording did not align closely enough with the practice sentence to provide reliable word-level pronunciation feedback. Listen to what the system heard, then try another recording if useful.</p>
                  : intelligibilityHasNoSpecificIssue ? <div className="goal-interpretation" role="status">
                    <p className="label">What this can tell you</p>
                    <p>The system recognized the words you intended to say. This gives you one piece of evidence about how your message came through to the system.</p>
                    <p className="hint">The system’s transcription does not guarantee that every listener would understand the recording the same way.</p>
                  </div>
                  : <p className="match-context" role="status">I couldn’t make a reliable word-level assessment. Try another recording.</p>
                ) : <>
                {condition !== 'A' && <p className="label">{reflectiveLabel}</p>}
                <h2 className="word">{flaggedWord.word}</h2>
                {condition !== 'A' ? (
                  <>
                    <p className="match-context">{reflectiveContext}</p>
                    <button className="explanation-toggle" aria-expanded={expanded} aria-controls="flag-explanation" onClick={() => setExpanded(!expanded)}>
                      {condition === 'C' ? 'Explore why' : showWordScore ? 'View model match details' : 'Why isn’t a score shown?'} <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
                    </button>
                    <div id="flag-explanation" className="explanation" hidden={!expanded}>
                      {showWordScore && <dl className="model-match-score">
                        <div><dt>Model match score</dt><dd>{flaggedWord.accuracyScore} / 100</dd></div>
                      </dl>}
                      {condition === 'C' && <p>The model was given the practice sentence as its reference. Returned text is not independent evidence that a listener understood you.</p>}
                      <p>
                      {showWordScore
                        ? 'This score reflects how closely the recording matched the pronunciation model’s reference. It does not directly measure whether another listener would understand you.'
                        : 'The model reported a missing or extra word. A number here could confuse word matching with pronunciation, so it is not shown.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>{directMessage}</p>
                    {showWordScore && <p className="score">Score: <strong>{flaggedWord.accuracyScore}%</strong></p>}
                  </>
                )}
                </>}
                </>}
              </div>
              <div className={`feedback-comparison${learnerGoal === 'example' ? ' example-focused' : ''}${explorationWaiting ? ' exploration-hidden' : ''}`}>
                <div className="comparison-item">
                  <p className="label" id="feedback-recording-label">Your recording</p>
                  {feedbackRecordingUrl && !scenario ? <RecordingPlayer key={feedbackRecordingUrl} src={feedbackRecordingUrl} labelledBy="feedback-recording-label" playerRef={feedbackAudioRef} />
                    : <p className="hint">{scenario ? 'No recording is attached to this simulated assessment.' : 'Your recording is unavailable.'}</p>}
                </div>
                <div className="comparison-item">
                  <p className="label">One pronunciation example</p>
                  <PronunciationExample key={`${scenarioId}-${condition}-${flaggedWord?.word || feedbackReferenceText}`} word={flaggedWord?.word || feedbackReferenceText} />
                </div>
                <div className="comparison-item comparison-sentence">
                  <p className="label">Sentence practiced</p>
                  <blockquote>“{feedbackReferenceText}”</blockquote>
                </div>
              </div>
              {!scenario && !explorationWaiting && <AttemptComparison attempts={currentPhraseAttempts.slice(-2)} />}
              {!explorationWaiting && (condition === 'A' ? <div className="actions">
                <button className="primary full-width" onClick={practiceAgain}>Practice Again</button>
              </div> : <LearnerResponse
                key={`${condition}-${scenarioId}-${explorationResponse}`}
                word={hasUsefulWord ? flaggedWord.word : ''}
                errorType={hasUsefulWord ? flaggedWord.errorType : ''}
                canListen={Boolean(feedbackRecordingUrl && !scenario)}
                goal={learnerGoal}
                initialResponse={explorationResponse}
                intelligibilityConfirmed={learnerGoal === 'understood' && fullTranscriptMatch}
                onListen={listenAgain}
                onHearExample={hearExampleAgain}
                onPractice={() => { rememberPreference(flaggedWord?.word, 'practice'); startAnotherAttempt(); }}
                onFinish={(keep) => { rememberPreference(flaggedWord?.word, keep ? 'keep' : 'unsure'); finishPractice(keep); }}
                finishLabel={phraseIndex < PHRASES.length - 1 ? 'Next phrase' : 'Finish session'}
              />)}
            </>
          )}

          {screen === 'complete' && (
            <>
              <p className="session-reflection-label">Session complete</p>
              <p className="hint">You practiced {sessionPhrases.filter((phrase) => phrase.attempts.length > 0).length} {sessionPhrases.filter((phrase) => phrase.attempts.length > 0).length === 1 ? 'phrase' : 'phrases'} and shared your perspective on the feedback.</p>
              <div className="actions"><button className="secondary full-width" onClick={practiceAgain}>Start a New Practice</button></div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
