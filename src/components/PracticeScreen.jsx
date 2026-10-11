import { useEffect, useState } from 'react';
import RecordingPlayer from './RecordingPlayer.jsx';

export default function PracticeScreen({
  referenceText,
  status,
  audioUrl,
  error,
  busy,
  onStartRecording,
  onStopRecording,
  onAnalyze,
  onRecordAgain,
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== 'recording') {
      return undefined;
    }

    const startedAt = Date.now();
    const reset = window.setTimeout(() => setElapsedSeconds(0), 0);
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    return () => {
      window.clearTimeout(reset);
      window.clearInterval(timer);
    };
  }, [status]);

  const recordingActive = status === 'recording';
  const elapsedLabel = `0:${String(elapsedSeconds).padStart(2, '0')}`;
  const micDisabled = busy && !recordingActive;
  const processingMessage = {
    requesting: 'Waiting for microphone access…',
    stopping: 'Saving your recording…',
    analyzing: 'Analyzing pronunciation…',
  }[status];

  return (
    <>
      <div className="sentence-block">
        <p className="label">Practice this sentence</p>
        <blockquote>“{referenceText}”</blockquote>
      </div>

      <p className="hint recording-instruction">
        Read the sentence naturally when you’re ready.
      </p>

      {!audioUrl && (
        <div
          className={`recording-control${
            recordingActive ? ' is-recording' : ''
          }`}
        >
          <button
            className="mic-button"
            type="button"
            onClick={recordingActive ? onStopRecording : onStartRecording}
            disabled={micDisabled}
            aria-label={recordingActive ? 'Stop recording' : 'Start recording'}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <rect x="8" y="3" width="8" height="12" rx="4" />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <span className="mic-label">
            {recordingActive ? 'Tap to stop' : 'Tap to record'}
          </span>

          <span className="recording-limit">Up to 30 seconds</span>

          {recordingActive && (
            <span className="recording-time" role="timer">
              {elapsedLabel}
            </span>
          )}
        </div>
      )}

      {processingMessage && (
        <p
          className="recording-status"
          data-status={status}
          role="status"
          aria-live="polite"
        >
          {processingMessage}
        </p>
      )}

      {audioUrl && !busy && (
        <div className="playback">
          <p id="recording-label" className="label">
            Review your recording
          </p>

          <RecordingPlayer
            key={audioUrl}
            src={audioUrl}
            labelledBy="recording-label"
          />
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {status !== 'recording' && audioUrl && !busy && (
        <div className="actions recording-actions">
          <button className="secondary" onClick={onRecordAgain}>
            Record again
          </button>

          <button className="primary" onClick={onAnalyze}>
            Analyze pronunciation
          </button>
        </div>
      )}

      <p className="privacy-note">
        Audio is analyzed by Microsoft Azure and is not stored by this app.
      </p>
    </>
  );
}
