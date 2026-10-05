import RecordingPlayer from './RecordingPlayer.jsx';

export default function PracticeScreen({ referenceText, status, audioUrl, error, busy, onStartRecording, onStopRecording, onAnalyze, onRecordAgain }) {
  return (
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
          <button className="primary" onClick={onStopRecording}>Stop recording</button>
        ) : busy ? (
          <button className="primary" disabled>{status === 'analyzing' ? 'Analyzing pronunciation…' : status === 'requesting' ? 'Opening microphone…' : 'Saving…'}</button>
        ) : audioUrl ? (
          <>
            <button className="primary" onClick={onAnalyze}>Analyze pronunciation</button>
            <button className="secondary" onClick={onRecordAgain}>Record again</button>
          </>
        ) : (
          <button className="primary" onClick={onStartRecording}>Start recording</button>
        )}
      </div>
      <p className="privacy-note">Analyze pronunciation sends your recording to Microsoft Azure. This app does not save recordings on the server.</p>
    </>
  );
}
