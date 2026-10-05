export default function CompletionScreen({ phraseCount, onRestart }) {
  return (
    <>
      <p className="session-reflection-label">Session complete</p>
      <p className="hint">You practiced {phraseCount} {phraseCount === 1 ? 'phrase' : 'phrases'} and shared your perspective on the feedback.</p>
      <div className="actions"><button className="secondary full-width" onClick={onRestart}>Start a New Practice</button></div>
    </>
  );
}
