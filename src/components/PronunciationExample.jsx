import { useEffect, useRef, useState } from 'react';

export default function PronunciationExample({ word }) {
  const utteranceRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => () => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      window.speechSynthesis?.cancel();
    }
  }, []);

  function playExample() {
    setMessage('');
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setMessage('Example audio is unavailable in this browser.');
      return;
    }
    const synthesis = window.speechSynthesis;
    if (playing) {
      synthesis.cancel();
      setPlaying(false);
      return;
    }
    try {
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      const voices = synthesis.getVoices();
      const voice = voices.find((candidate) => candidate.lang === 'en-US')
        || voices.find((candidate) => /^en[-_]/i.test(candidate.lang));
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.onend = () => setPlaying(false);
      utterance.onerror = (event) => {
        setPlaying(false);
        if (!['canceled', 'interrupted'].includes(event.error)) {
          setMessage('The example could not play. Please try again.');
        }
      };
      utteranceRef.current = utterance;
      setPlaying(true);
      synthesis.speak(utterance);
    } catch {
      setPlaying(false);
      setMessage('The example could not play. Please try again.');
    }
  }

  return (
    <div className="pronunciation-example">
      <button className="example-button" onClick={playExample}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" strokeLinecap="round" />
        </svg>
        {playing ? 'Stop example' : 'Hear an example'}
      </button>
      <p className="example-message" role="status">{message}</p>
    </div>
  );
}
