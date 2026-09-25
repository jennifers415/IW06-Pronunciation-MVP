export const PHRASES = [
  { id: 'library', text: 'Could you tell me where the library is?' },
  { id: 'comfortable', text: 'This chair is very comfortable.' },
];
export const DEFAULT_PHRASE_ID = PHRASES[0].id;
export const REFERENCE_TEXT = PHRASES[0].text;
export const MAX_AUDIO_SECONDS = 30;
export const SAMPLE_RATE = 16000;

export function getPhrase(phraseId = DEFAULT_PHRASE_ID) {
  return PHRASES.find((phrase) => phrase.id === phraseId) || null;
}

// Guards the UI against pairing a word-level result with the wrong phrase
export function referenceContainsWord(word, referenceText) {
  if (typeof word !== 'string' || typeof referenceText !== 'string') return false;
  const tokens = referenceText.match(/[\p{L}\p{N}]+/gu) || [];
  return tokens.some((token) => token.toLocaleLowerCase() === word.trim().toLocaleLowerCase());
}

export function assessReferenceAlignment(recognizedText, referenceText) {
  const tokens = (value) => typeof value === 'string'
    ? value.match(/[\p{L}\p{N}]+/gu)?.map((token) => token.toLocaleLowerCase()) || [] : [];
  const recognized = tokens(recognizedText);
  const reference = tokens(referenceText);
  const remaining = [...recognized];
  let matchedReferenceWordCount = 0;
  for (const token of reference) {
    const index = remaining.indexOf(token);
    if (index >= 0) {
      matchedReferenceWordCount += 1;
      remaining.splice(index, 1);
    }
  }
  const coverage = reference.length ? matchedReferenceWordCount / reference.length : 0;
  return {
    referenceWordCount: reference.length,
    recognizedWordCount: recognized.length,
    matchedReferenceWordCount,
    coverage,
    substantialMismatch: !recognized.length || !reference.length || coverage < 0.5,
  };
}
