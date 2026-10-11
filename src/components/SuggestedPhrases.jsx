import { useId, useState } from 'react';

export default function SuggestedPhrases({ phrases, focusId, onPracticePhrase }) {
  const [phraseId, setPhraseId] = useState(phrases[0]?.id || '');
  const id = useId();
  const choices = (items) => items.map((phrase) => <label className="suggested-phrase" key={phrase.id}>
    <input type="radio" name={id} value={phrase.id} checked={phraseId === phrase.id} onChange={() => setPhraseId(phrase.id)} />
    <span>{phrase.text}</span>
  </label>);
  return <fieldset className="suggested-phrases">
    <legend>Suggested phrases</legend>
    {choices(phrases.slice(0, 3))}
    {phrases.length > 3 && <details><summary>Show {phrases.length - 3} more phrases</summary>{choices(phrases.slice(3))}</details>}
    {onPracticePhrase && <button className="secondary" disabled={!phraseId} onClick={() => onPracticePhrase(phraseId, focusId)}>Practice this phrase</button>}
  </fieldset>;
}
