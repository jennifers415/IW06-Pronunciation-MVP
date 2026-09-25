import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, transcriptMatchesReference } from '../src/scenarios.js';

test('transcript comparison ignores case/punctuation, not missing or changed words', () => {
  assert.equal(transcriptMatchesReference('COULD you tell me where the library is!'), true);
  assert.equal(transcriptMatchesReference('Could  you tell me where the library is?'), true);
  assert.equal(transcriptMatchesReference('Tell me where the library is.'), false);
  assert.equal(transcriptMatchesReference('Could you tell me where the bakery is?'), false);
  assert.equal(transcriptMatchesReference(''), false);
  assert.equal(transcriptMatchesReference(null), false);
  assert.equal(transcriptMatchesReference('This chair is very comfortable.', 'This chair is very comfortable.'), true);
  assert.equal(transcriptMatchesReference('Could you tell me where the library is?', 'This chair is very comfortable.'), false);
});

test('agreement and disagreement exercises use identical evidence', () => {
  assert.deepEqual(SCENARIOS.agreement.result, SCENARIOS.disagreement.result);
  assert.equal(SCENARIOS.questionable.result.flaggedWord.errorType, 'Omission');
  assert.equal(transcriptMatchesReference(SCENARIOS.questionable.result.recognizedText), false);
});
