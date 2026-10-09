// Internal practice targets for General American English, matching assessment's
// en-US locale. These are curated highlights, not exhaustive phonetic annotations
// or learner scores. Words retain their spelling and case from the phrase text.
// Stable feature IDs can be used for future phrase selection; labels are descriptive.
export const PRONUNCIATION_FEATURES = {
  r: { label: 'R sound /ɹ/' },
  l: { label: 'L sound /l/' },
  th_voiced: { label: 'Voiced th /ð/' },
  th_unvoiced: { label: 'Unvoiced th /θ/' },
  consonant_clusters: { label: 'Adjacent consonant sounds within a word' },
  v: { label: 'V sound /v/' },
  w: { label: 'W sound /w/' },
  sh: { label: 'Sh sound /ʃ/' },
  ch: { label: 'Ch sound /tʃ/' },
};

// pronunciationFeatures: { featureId: keyof PRONUNCIATION_FEATURES, words: string[] }[]
// A word may appear under multiple features. IDs and order preserve the existing
// default phrase and sequential practice flow. Metadata is not sent to Azure.
export const PHRASES = [
  {
    id: 'library',
    text: 'Could you tell me where the library is?',
    pronunciationFeatures: [
      { featureId: 'r', words: ['where', 'library'] },
      { featureId: 'l', words: ['tell', 'library'] },
      { featureId: 'th_voiced', words: ['the'] },
      { featureId: 'consonant_clusters', words: ['library'] },
    ],
  },
  {
    id: 'comfortable',
    text: 'This chair is very comfortable.',
    pronunciationFeatures: [
      { featureId: 'th_voiced', words: ['This'] },
      { featureId: 'ch', words: ['chair'] },
      { featureId: 'r', words: ['chair', 'very', 'comfortable'] },
      { featureId: 'l', words: ['comfortable'] },
      { featureId: 'v', words: ['very'] },
    ],
  },
  {
    id: 'coffee',
    text: 'Would you like a little milk in your coffee?',
    pronunciationFeatures: [
      { featureId: 'w', words: ['Would'] },
      { featureId: 'l', words: ['like', 'little', 'milk'] },
      { featureId: 'consonant_clusters', words: ['milk'] },
    ],
  },
  {
    id: 'thursday',
    text: 'I think we can meet on Thursday.',
    pronunciationFeatures: [
      { featureId: 'th_unvoiced', words: ['think', 'Thursday'] },
      { featureId: 'w', words: ['we'] },
      { featureId: 'consonant_clusters', words: ['think'] },
    ],
  },
  {
    id: 'brother',
    text: 'My brother lives with our parents.',
    pronunciationFeatures: [
      { featureId: 'th_voiced', words: ['brother'] },
      { featureId: 'r', words: ['brother', 'parents'] },
      { featureId: 'l', words: ['lives'] },
      { featureId: 'v', words: ['lives'] },
      { featureId: 'consonant_clusters', words: ['brother', 'lives', 'parents'] },
    ],
  },
  {
    id: 'train',
    text: 'The next train leaves in ten minutes.',
    pronunciationFeatures: [
      { featureId: 'th_voiced', words: ['The'] },
      { featureId: 'r', words: ['train'] },
      { featureId: 'l', words: ['leaves'] },
      { featureId: 'consonant_clusters', words: ['next', 'train', 'leaves', 'minutes'] },
    ],
  },
  {
    id: 'shopping',
    text: 'Can you grab some fresh bread on your way home?',
    pronunciationFeatures: [
      { featureId: 'r', words: ['grab', 'fresh', 'bread'] },
      { featureId: 'sh', words: ['fresh'] },
      { featureId: 'w', words: ['way'] },
      { featureId: 'consonant_clusters', words: ['grab', 'fresh', 'bread'] },
    ],
  },
  {
    id: 'jacket',
    text: 'I left my blue jacket in the car.',
    pronunciationFeatures: [
      { featureId: 'l', words: ['left', 'blue'] },
      { featureId: 'th_voiced', words: ['the'] },
      { featureId: 'r', words: ['car'] },
      { featureId: 'consonant_clusters', words: ['left', 'blue'] },
    ],
  },
  {
    id: 'lunch',
    text: 'Should we share a sandwich for lunch?',
    pronunciationFeatures: [
      { featureId: 'sh', words: ['Should', 'share'] },
      { featureId: 'w', words: ['we'] },
      { featureId: 'ch', words: ['lunch'] },
      { featureId: 'l', words: ['lunch'] },
      { featureId: 'consonant_clusters', words: ['lunch'] },
    ],
  },
  {
    id: 'thanks',
    text: 'Thanks for helping me move these boxes.',
    pronunciationFeatures: [
      { featureId: 'th_unvoiced', words: ['Thanks'] },
      { featureId: 'th_voiced', words: ['these'] },
      { featureId: 'l', words: ['helping'] },
      { featureId: 'v', words: ['move'] },
      { featureId: 'consonant_clusters', words: ['Thanks', 'helping', 'boxes'] },
    ],
  },
];

export const DEFAULT_PHRASE_ID = PHRASES[0].id;
export const REFERENCE_TEXT = PHRASES[0].text;

export function getPhrase(phraseId = DEFAULT_PHRASE_ID) {
  return PHRASES.find((phrase) => phrase.id === phraseId) || null;
}
