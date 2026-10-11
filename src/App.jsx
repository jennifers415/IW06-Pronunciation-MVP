import { useEffect, useRef, useState } from 'react';
import useRecording from './hooks/useRecording.js';
import { PHRASES, referenceContainsWord } from '../shared/assessment.js';
import { createPronunciationObservations } from '../shared/pronunciationPatterns.js';
import { SCENARIOS, transcriptMatchesReference } from './scenarios.js';
import { createLearnerJudgment, currentResponseForAttempt, responseForGoal } from './learnerState.js';
import './App.css';
import { LEARNER_GOALS } from './learnerGoals.js';
import ResearchControls from './components/ResearchControls.jsx';
import GoalScreen from './components/GoalScreen.jsx';
import PracticeScreen from './components/PracticeScreen.jsx';
import FeedbackScreen from './components/FeedbackScreen.jsx';
import CompletionScreen from './components/CompletionScreen.jsx';
import LearnerViews from './components/LearnerViews.jsx';
import ProgressView from './components/ProgressView.jsx';
import PracticeFocus from './components/PracticeFocus.jsx';
import ContextSidebar from './components/ContextSidebar.jsx';
import PracticeRecommendations from './components/PracticeRecommendations.jsx';
import useRecommendationChoices from './hooks/useRecommendationChoices.js';

function App() {
  const [screen, setScreen] = useState('goal');
  const [view, setView] = useState('practice');
  const [learnerGoal, setLearnerGoal] = useState(null);
  const [, setLearnerPreferences] = useState({});
  const [condition] = useState('B');
  const [feedbackOrder, setFeedbackOrder] = useState('ai-first');
  const [expanded, setExpanded] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [scenarioId, setScenarioId] = useState('');
  const [studioResponse, setStudioResponse] = useState('');
  const studioReturnScreen = useRef('practice');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [attempts, setAttempts] = useState([]);
  const [learnerFirstJudgment, setLearnerFirstJudgment] = useState({ goalId: '', value: '' });
  const [postAiResponse, setPostAiResponse] = useState('');
  const [researchLog, setResearchLog] = useState([]);
  const recommendations = useRecommendationChoices(logRecommendationEvent);
  const [optionalPractice, setOptionalPractice] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [sessionPhrases, setSessionPhrases] = useState(() => PHRASES.map((phrase) => ({
    phraseId: phrase.id, attempts: [], finalDecision: null,
  })));
  const feedbackAudioRef = useRef(null);
  const analysisRef = useRef(null);
  const attemptsRef = useRef([]);
  const sessionPhrasesRef = useRef(sessionPhrases);
  const { status, setStatus, audioUrl, error, setError, busy, recordingRef, urlRef, clearDraftRecording, startRecording, stopRecording } = useRecording({
    onNewRecording: () => {
      setLearnerFirstJudgment({ goalId: '', value: '' });
      setPostAiResponse('');
    },
  });
  const currentPhrase = PHRASES[phraseIndex] || PHRASES[0];
  const referenceText = currentPhrase.text;
  const currentPhraseAttempts = attempts.filter((attempt) => attempt.phraseId === currentPhrase.id);
  const currentAttempt = currentPhraseAttempts.at(-1) || null;
  const feedbackReferenceText = currentAttempt?.referenceText || referenceText;
  const feedbackRecordingUrl = currentAttempt?.recordingUrl || audioUrl;
  const headingRef = useRef(null);

  useEffect(() => {
    return () => {
      analysisRef.current?.abort();
      analysisRef.current = null;
      attemptsRef.current.forEach((attempt) => URL.revokeObjectURL(attempt.recordingUrl));
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [screen]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__pronunciationResearchLog = researchLog;
    return () => { delete window.__pronunciationResearchLog; };
  }, [researchLog]);


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
    setLearnerFirstJudgment({ goalId: '', value: '' });
    setPostAiResponse('');
    setResearchLog([]);
  }

  function practiceAgain() {
    setView('practice');
    clearSession();
    setOptionalPractice(false);
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
    if (scenarioId) return;
    const key = preferenceKey(word);
    if (key) setLearnerPreferences((previous) => ({ ...previous, [key]: decision }));
  }

  function startAnotherAttempt() {
    if (scenarioId) {
      changeScenario({ target: { value: '' } });
      return;
    }
    const current = attemptsRef.current.at(-1);
    const currentWord = current?.assessment?.flaggedWord?.word || assessment?.flaggedWord?.word;
    rememberPreference(currentWord, 'practice');
    if (current) setAttemptHistory(attemptsRef.current.map((attempt) => attempt.id === current.id
      ? { ...attempt, learnerDecision: 'practice' } : attempt));
    clearDraftRecording();
    setError('');
    setExpanded(false);
    setAttemptNumber((number) => number + 1);
    setLearnerFirstJudgment({ goalId: '', value: '' });
    setPostAiResponse('');
    setStatus('idle');
    setScreen('practice');
  }


  function changeFeedbackOrder(event) {
    feedbackAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setFeedbackOrder(event.target.value);
    setLearnerFirstJudgment({ goalId: '', value: '' });
    setPostAiResponse('');
    setExpanded(false);
  }

  function changeScenario(event) {
    if (busy) return;
    setView('practice');
    feedbackAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    const id = event.target.value;
    if (id && !scenarioId) studioReturnScreen.current = screen;
    setScenarioId(id);
    setStudioResponse('');
    setExpanded(false);
    setError('');
    setScreen(id ? 'feedback' : studioReturnScreen.current);
  }

  function finishPractice(keep = false) {
    if (scenarioId) {
      changeScenario({ target: { value: '' } });
      return;
    }
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
    if (optionalPractice) {
      setOptionalPractice(false);
      setScreen('complete');
      return;
    }
    if (phraseIndex < PHRASES.length - 1) {
      const nextIndex = phraseIndex + 1;
      setPhraseIndex(nextIndex);
      attemptsRef.current = [];
      setAttempts([]);
      setAssessment(null);
      setLearnerFirstJudgment({ goalId: '', value: '' });
      setPostAiResponse('');
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
        id: `${currentPhrase.id}-${attemptNumber}-${attemptsRef.current.length + 1}`,
        phraseId: currentPhrase.id,
        recording: wav,
        recordingUrl: urlRef.current,
        assessment: result,
        assessedAt: new Date().toISOString(),
        referenceText,
        learnerDecision: null,
      };
      attempt.pronunciationObservations = createPronunciationObservations(attempt);
      setAttemptHistory([...attemptsRef.current, attempt]);
      // The attempt now owns this URL; it must survive another recording.
      urlRef.current = '';
      setAssessment(result);
      setLearnerFirstJudgment({ goalId: '', value: '' });
      setPostAiResponse('');
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
  const signalsConflict = learnerGoal === 'understood' && Boolean(returnedText) && !fullTranscriptMatch && explicitIssue;
  const explorationSignalsConflict = learnerGoal === 'explore' && Boolean(returnedText) && !fullTranscriptMatch && explicitIssue;
  const exampleSignalsConflict = learnerGoal === 'example' && Boolean(returnedText) && !fullTranscriptMatch && explicitIssue;
  const learnerFirstResponse = responseForGoal(learnerFirstJudgment, learnerGoal);
  const learnerFirstWaiting = feedbackOrder === 'learner-first' && !learnerFirstResponse && !scenario;
  const currentLearnerResponse = scenario ? studioResponse : postAiResponse || learnerFirstResponse;
  const learnerResponseConflicts = learnerGoal === 'understood' && !learnerFirstWaiting && (
    (currentLearnerResponse === 'ai-misunderstood' || (currentLearnerResponse === 'understood' && (!fullTranscriptMatch || explicitIssue)))
    || (currentLearnerResponse === 'unclear' && fullTranscriptMatch && !explicitIssue)
  );
  const intelligibilityHasNoSpecificIssue = learnerGoal === 'understood' && fullTranscriptMatch && !explicitIssue;
  const explorationHasNoSpecificIssue = learnerGoal === 'explore' && !explicitIssue;
  const flaggedWordMatchesReference = referenceContainsWord(candidateFlaggedWord?.word, feedbackReferenceText);
  const exampleHasSpecificIssue = learnerGoal === 'example' && !substantialMismatch && flaggedWordMatchesReference && explicitIssue;
  const exampleHasNoSpecificIssue = learnerGoal === 'example' && !exampleHasSpecificIssue;
  const modelSignalsSuggestDifference = !fullTranscriptMatch || explicitIssue || substantialMismatch;
  const challengeAvailable = (
    (currentLearnerResponse === 'understood' && modelSignalsSuggestDifference)
    || (currentLearnerResponse === 'unclear' && fullTranscriptMatch && !explicitIssue)
    || (currentLearnerResponse === 'none' && modelSignalsSuggestDifference)
    || (currentLearnerResponse === 'example-satisfied' && modelSignalsSuggestDifference)
  );
  const flaggedWord = !intelligibilityHasNoSpecificIssue && !explorationHasNoSpecificIssue && !exampleHasNoSpecificIssue && !explorationSignalsConflict && !exampleSignalsConflict ? candidateFlaggedWord : null;
  const returnedTextHasWords = /[\p{L}\p{N}]/u.test(returnedText);
  const isMiscue = ['Omission', 'Insertion'].includes(flaggedWord?.errorType);
  
  // A miscue does not always mean the pronunciation was wrong.
  // A low or zero accuracy score does not mean the model is unsure.
  const showWordScore = flaggedWordMatchesReference && ['None', 'Mispronunciation'].includes(flaggedWord?.errorType)
    && Number.isFinite(flaggedWord?.accuracyScore)
    && flaggedWord.accuracyScore >= 0 && flaggedWord.accuracyScore <= 100;
  const hasUsefulWord = Boolean(!substantialMismatch && flaggedWord?.word && (isMiscue || showWordScore));
  const goalLabel = LEARNER_GOALS.find((goal) => goal.id === learnerGoal)?.label;
  const directMessage = !flaggedWordMatchesReference ? 'The AI listener returned a word outside this practice sentence. Listen again before treating it as a pronunciation finding.'
    : flaggedWord?.errorType === 'Mispronunciation' ? `The AI listener marked a lower pronunciation match for “${flaggedWord.word}”.`
    : flaggedWord?.errorType === 'Omission' ? 'The AI listener may not have detected this word. Listen again before drawing a conclusion.'
      : flaggedWord?.errorType === 'Insertion' ? 'The AI listener may have detected an extra word. Listen again before drawing a conclusion.'
        : 'Lowest available AI match. This comparison alone does not identify a pronunciation problem.';
  const reflectiveLabel = !flaggedWordMatchesReference ? 'Word returned outside the practice sentence'
    : learnerGoal === 'explore' ? 'A pronunciation difference the model noticed'
    : learnerGoal === 'example' ? 'A difference from the example'
    : flaggedWord?.errorType === 'Mispronunciation' ? 'Word the AI listener had difficulty matching'
    : flaggedWord?.errorType === 'Omission' ? 'The AI listener may have missed:'
      : flaggedWord?.errorType === 'Insertion' ? 'The AI listener detected an extra word:'
        : 'Word with the lowest match';

  const reflectiveContext = !flaggedWordMatchesReference
    ? 'The returned word does not belong to this attempt’s reference sentence. That may reflect an alignment problem or an unusual AI listening result.'
    : flaggedWord?.errorType === 'Omission'
    ? 'The AI listener may not have detected this word. That does not establish that you left it out; listen again and decide.'
    : flaggedWord?.errorType === 'Insertion'
      ? 'The AI listener matched a word outside the practice sentence. You can listen again and decide what to make of it.'
      : flaggedWord?.errorType === 'Mispronunciation'
        ? 'The AI listener marked a lower match with its pronunciation reference.'
        : 'This word had the lowest available match, but the AI listener did not mark a pronunciation difference. You can decide whether it deserves more attention.';

  const title = screen === 'goal'
    ? 'Explore the AI Listener'
    : screen === 'practice'
    ? 'Pronunciation Practice'
    : screen === 'complete'
      ? 'Practice complete.'
      : learnerFirstWaiting ? 'Listen to your recording'
        : condition === 'C' ? 'What the system heard'
        : learnerGoal === 'understood' ? 'Here’s how the model interpreted your recording'
        : condition === 'B' ? 'Here’s what the model noticed' : 'Pronunciation Feedback';

  function selectGoal(goal) {
    setLearnerGoal(goal);
    setLearnerFirstJudgment({ goalId: '', value: '' });
    setPostAiResponse('');
  }

  function handleInitialResponse(value) {
    const judgment = createLearnerJudgment(learnerGoal, value);
    if (!judgment.value) return;
    setLearnerFirstJudgment(judgment);
    const disagrees = learnerGoal === 'understood'
      ? (value === 'understood' && explicitIssue) || (value === 'unclear' && !explicitIssue)
      : learnerGoal === 'explore'
        ? (value === 'none' && explicitIssue) || (value === 'explore' && !explicitIssue)
        : (judgment.value === 'example-satisfied' && explicitIssue) || (judgment.value === 'example-practice' && !explicitIssue);
    setResearchLog((entries) => [...entries, {
      event: 'pre-ai-judgment', phase: 'pre-ai', goal: learnerGoal, feedbackOrder,
      judgment: judgment.value, appearsToDisagree: disagrees, timestamp: new Date().toISOString(),
    }]);
  }

  function handlePostResponse(value) {
    if (scenarioId) setStudioResponse(value);
    else setPostAiResponse(value);
    setResearchLog((entries) => [...entries, {
      event: 'post-ai-response', phase: 'post-ai', goal: learnerGoal, feedbackOrder,
      response: value, simulated: Boolean(scenarioId), scenarioId: scenarioId || null, timestamp: new Date().toISOString(),
    }]);
  }

  function logAction(action) {
    setResearchLog((entries) => [...entries, { event: 'learner-action', goal: learnerGoal, feedbackOrder, action, simulated: Boolean(scenarioId), scenarioId: scenarioId || null, timestamp: new Date().toISOString() }]);
  }

  function logChallenge(response) {
    setResearchLog((entries) => [...entries, {
      event: 'challenge-ai', phase: 'post-ai', goal: learnerGoal, feedbackOrder,
      attemptId: scenarioId ? null : currentAttempt?.id || null, scenarioId: scenarioId || null,
      response, simulated: Boolean(scenarioId), timestamp: new Date().toISOString(),
    }]);
  }

  function logFinalAction(action, response) {
    setResearchLog((entries) => [...entries, {
      event: 'final-action', goal: learnerGoal, feedbackOrder, response: scenarioId ? studioResponse : response, action,
      simulated: Boolean(scenarioId), scenarioId: scenarioId || null, timestamp: new Date().toISOString(),
    }]);
  }

  function logRecommendationEvent(decision) {
    setResearchLog((entries) => [...entries, {
      event: 'recommendation-decision', goal: learnerGoal, feedbackOrder,
      simulated: false, ...decision, timestamp: new Date().toISOString(),
    }]);
  }

  function startRecommendedPractice(phraseId, featureId) {
    if (busy || screen !== 'complete') return;
    const index = PHRASES.findIndex((phrase) => phrase.id === phraseId);
    if (index < 0) return;
    setView('practice');
    logRecommendationEvent({ action: 'practice', featureId, phraseId });
    const previousAttempts = sessionPhrasesRef.current[index].attempts;
    clearDraftRecording();
    setPhraseIndex(index);
    attemptsRef.current = previousAttempts;
    setAttempts(previousAttempts);
    setAttemptNumber(previousAttempts.length + 1);
    setAssessment(null);
    setScenarioId('');
    setLearnerFirstJudgment({ goalId: '', value: '' });
    setPostAiResponse('');
    setError('');
    setExpanded(false);
    setStatus('idle');
    setOptionalPractice(true);
    setScreen('practice');
  }

  function leaveOptionalPractice() {
    if (busy) return;
    clearDraftRecording();
    setError('');
    setStatus('idle');
    setOptionalPractice(false);
    setScreen('complete');
  }

  function changeView(nextView) {
    if (busy || nextView === view) return;
    document.querySelectorAll('audio').forEach((player) => player.pause());
    window.speechSynthesis?.cancel();
    setView(nextView);
  }

  // A studio scenario changes displayed feedback, not permission to inspect live evidence.
  const reflectionPending = (scenarioId ? studioReturnScreen.current : screen) === 'feedback'
    && Boolean(currentAttempt) && feedbackOrder === 'learner-first' && !learnerFirstResponse;
  const reflectionNotice = <p className="hint">Complete your initial reflection in Practice before viewing AI observations or recommendations.</p>;

  return (
    <div className="app-shell">
      <main className="practice-panel">
        <LearnerViews view={view} onViewChange={changeView} busy={busy}
          sidebar={<ContextSidebar stage={screen} referenceText={referenceText} learnerResponse={learnerFirstResponse} goal={learnerGoal} choices={recommendations.choices} sessionPhrases={sessionPhrases} reflectionPending={reflectionPending} showObservations={!scenario && (screen === 'feedback' || screen === 'complete')} view={view} onViewChange={changeView} busy={busy} />}
          progress={reflectionPending ? reflectionNotice : <ProgressView sessionPhrases={sessionPhrases} />}
          focus={<section className="screen"><h1>My Focus</h1>{reflectionPending ? reflectionNotice : <PracticeRecommendations sessionPhrases={sessionPhrases} choices={recommendations.choices} onDecision={recommendations.decide} goal={learnerGoal} showPhrases={false} />}</section>}
          practice={<>
        <section className={`screen screen-${screen}`} aria-labelledby="screen-title">
          <p className="eyebrow">{screen === 'goal' ? 'Before practice' : screen === 'practice' ? `${phraseIndex + 1} / ${PHRASES.length} Practice · Attempt ${attemptNumber}` : screen === 'feedback' ? `${phraseIndex + 1} / ${PHRASES.length} Feedback` : 'Session finished'}</p>
          <h1 id="screen-title" ref={headingRef} tabIndex={-1}>{title}</h1>
          {!busy && <PracticeFocus showContext={false} sessionPhrases={sessionPhrases} choices={recommendations.choices} onManage={() => changeView('focus')} onPracticePhrase={screen === 'complete' ? startRecommendedPractice : undefined} />}
          {screen === 'feedback' && scenario && <aside className="scenario-notice" aria-label="Simulated studio assessment"><p><strong>Studio scenario: {scenario.label} — simulated</strong></p><p>This is fixed example feedback, not an assessment of your recording. {scenario.prompt}</p></aside>}
          {screen === 'goal' && <GoalScreen selectedGoal={learnerGoal} onSelectGoal={selectGoal} onContinue={beginSession} />}
          {screen === 'practice' && <PracticeScreen referenceText={referenceText} status={status} audioUrl={audioUrl} error={error} busy={busy} onStartRecording={startRecording} onStopRecording={stopRecording} onAnalyze={() => getFeedback(recordingRef.current)} onRecordAgain={startRecording} />}
          {screen === 'practice' && optionalPractice && <button className="action-link" disabled={busy} onClick={leaveOptionalPractice}>Return to session summary</button>}
          {screen === 'feedback' && activeAssessment && <FeedbackScreen
            activeAssessment={activeAssessment} scenario={scenario} goal={learnerGoal} goalLabel={goalLabel}
            learnerFirstWaiting={learnerFirstWaiting} feedbackRecordingUrl={feedbackRecordingUrl} feedbackReferenceText={feedbackReferenceText}
            feedbackAudioRef={feedbackAudioRef} returnedText={returnedText} returnedTextHasWords={returnedTextHasWords}
            fullTranscriptMatch={fullTranscriptMatch} substantialMismatch={substantialMismatch}
            signalsConflict={signalsConflict} learnerResponseConflicts={learnerResponseConflicts} challengeAvailable={challengeAvailable}
            explorationSignalsConflict={explorationSignalsConflict} conflictWord={(explorationSignalsConflict || exampleSignalsConflict || (substantialMismatch && explicitIssue)) ? candidateFlaggedWord : null}
            exampleSignalsConflict={exampleSignalsConflict}
            explorationHasNoSpecificIssue={explorationHasNoSpecificIssue} exampleHasNoSpecificIssue={exampleHasNoSpecificIssue}
            intelligibilityHasNoSpecificIssue={intelligibilityHasNoSpecificIssue} hasUsefulWord={hasUsefulWord}
            flaggedWord={flaggedWord}
            showWordScore={showWordScore} reflectiveLabel={reflectiveLabel} reflectiveContext={reflectiveContext}
            directMessage={directMessage} expanded={expanded} onToggleExpanded={() => setExpanded(!expanded)} condition={condition}
            learnerFirstResponse={scenario ? '' : learnerFirstResponse} onListen={listenAgain} onHearExample={hearExampleAgain}
            onInitialResponse={handleInitialResponse} onResponseChange={handlePostResponse} onAction={logAction} onChallenge={logChallenge}
            requirePracticeReason
            onPractice={() => { logFinalAction('retry', currentResponseForAttempt({ preAi: learnerFirstJudgment, postAi: postAiResponse }, learnerGoal)); rememberPreference(flaggedWord?.word, 'practice'); startAnotherAttempt(); }}
            onFinish={(keep) => { logFinalAction('continue', currentResponseForAttempt({ preAi: learnerFirstJudgment, postAi: postAiResponse }, learnerGoal)); rememberPreference(flaggedWord?.word, keep ? 'keep' : 'unsure'); finishPractice(keep); }}
            finishLabel={optionalPractice ? 'Return to session summary' : phraseIndex < PHRASES.length - 1 ? 'Next phrase' : 'Finish session'} currentPhraseAttempts={currentPhraseAttempts} scenarioId={scenarioId}
          />}
          {screen === 'complete' && <CompletionScreen phraseCount={sessionPhrases.filter((phrase) => phrase.attempts.length > 0).length} onRestart={practiceAgain} />}
        </section>
          </>} />
      </main>
      <ResearchControls feedbackOrder={feedbackOrder} onFeedbackOrderChange={changeFeedbackOrder} scenarioId={scenarioId} onScenarioChange={changeScenario} scenarios={SCENARIOS} busy={busy} onRecommendationEvent={logRecommendationEvent} />
    </div>
  );
}

export default App;
