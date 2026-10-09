export default function CompletionScreen({ phraseCount, onRestart }) {
  return (
    <>
      <p className="hint completion-description">You practiced {phraseCount} {phraseCount === 1 ? 'phrase' : 'phrases'} and reflected on the model’s feedback.</p>
      <div className="actions"><button className="primary full-width" onClick={onRestart}>Start a new practice</button></div>
    </>
  );
}
