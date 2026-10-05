import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { normalizeAssessment, validateWav } from '../server/assessment.js';
import { encodeWav } from '../src/audio.js';
import { PHRASES, REFERENCE_TEXT, SAMPLE_RATE, assessReferenceAlignment, formatWordScore, hasUsableWordScore, referenceContainsWord } from '../shared/assessment.js';

const word = (Word, AccuracyScore, ErrorType = 'None') => ({ Word, AccuracyScore, ErrorType });
const result = (Words = [word('Could', 96), word('library', 58, 'Mispronunciation')]) => ({
  RecognitionStatus: 'Success',
  NBest: [{ Display: REFERENCE_TEXT, AccuracyScore: 84, Words }],
});
const wav = async (samples = new Float32Array(1600)) => Buffer.from(await encodeWav(samples).arrayBuffer());

test('normalizes REST data and prefers mispronunciation over a lower-score omission', () => {
  const output = normalizeAssessment(result([
    word('Could', 96), word('the', 0, 'Omission'), word('library', 58, 'Mispronunciation'), word('?', 0),
  ]), REFERENCE_TEXT);
  assert.equal(output.recognizedText, REFERENCE_TEXT);
  assert.equal(output.overallAccuracy, 84);
  assert.equal(output.words.length, 3);
  assert.deepEqual(output.flaggedWord, { word: 'library', accuracyScore: 58, errorType: 'Mispronunciation' });
  assert.deepEqual(Object.keys(output), ['recognizedText', 'overallAccuracy', 'words', 'flaggedWord', 'alignment']);
  assert.equal(output.alignment.substantialMismatch, false);
});

test('fallback selects lowest score, preserves zero, and keeps missing scores null', () => {
  assert.equal(normalizeAssessment(result([word('a', 96), word('b', 90)])).flaggedWord.word, 'b');
  const output = normalizeAssessment(result([word('a', undefined), word('b', 0)]));
  assert.equal(output.words[0].accuracyScore, null);
  assert.equal(output.flaggedWord.accuracyScore, 0);
  assert.equal(normalizeAssessment(result([word('a', undefined)])).flaggedWord, null);
  assert.equal(normalizeAssessment(result([])).flaggedWord, null);
  assert.equal(normalizeAssessment(result([word('a', 101), word('b', '58')])).flaggedWord, null);
});

test('unknown or unavailable word scores never become zero scores', () => {
  const output = normalizeAssessment(result([
    word('Could', 0, 'Unknown'),
    word('you', 0, 'Unavailable'),
    word('tell', null, 'Unknown'),
    word('me', 0, 'None'),
  ]), REFERENCE_TEXT);
  assert.deepEqual(output.words.slice(0, 3).map((entry) => entry.accuracyScore), [null, null, null]);
  assert.equal(output.words[3].accuracyScore, 0);
  assert.equal(hasUsableWordScore(output.words[0]), false);
  assert.equal(hasUsableWordScore(output.words[3]), true);
  assert.equal(formatWordScore({ accuracyScore: null, errorType: 'Unknown' }), 'Not available');
  assert.equal(formatWordScore({ accuracyScore: undefined, errorType: 'Unavailable' }), 'Not available');
  assert.equal(formatWordScore({ accuracyScore: 0, errorType: 'None' }), '0 / 100');
});

test('normalizes nested SDK fields and retains unscored omissions safely', () => {
  const output = normalizeAssessment({ RecognitionStatus: 'Success', DisplayText: 'Could', NBest: [{
    PronunciationAssessment: { AccuracyScore: 80 },
    Words: [{ Word: 'library', PronunciationAssessment: { ErrorType: 'Omission' } }],
  }] });
  assert.equal(output.overallAccuracy, 80);
  assert.deepEqual(output.flaggedWord, { word: 'library', accuracyScore: null, errorType: 'Omission' });
});

test('word-level display invariant only accepts words from the attempt reference', () => {
  assert.equal(referenceContainsWord('where', REFERENCE_TEXT), true);
  assert.equal(referenceContainsWord('where', 'This chair is very comfortable.'), false);
  assert.equal(referenceContainsWord('Comfortable', 'This chair is very comfortable.'), true);
});

test('alignment distinguishes localized feedback from substantial reference mismatch', () => {
  const localized = assessReferenceAlignment('This chair is comfortable.', 'This chair is very comfortable.');
  assert.equal(localized.matchedReferenceWordCount, 4);
  assert.equal(localized.substantialMismatch, false);
  const mismatch = assessReferenceAlignment('The is tell where is library', 'This chair is very comfortable.');
  assert.equal(mismatch.matchedReferenceWordCount, 1);
  assert.equal(mismatch.substantialMismatch, true);
});

test('missing speech and malformed Azure results become controlled errors', () => {
  for (const RecognitionStatus of ['NoMatch', 'InitialSilenceTimeout', 'BabbleTimeout']) {
    assert.throws(() => normalizeAssessment({ RecognitionStatus }), { status: 422 });
  }
  assert.throws(() => normalizeAssessment(null), { status: 502 });
  assert.throws(() => normalizeAssessment({ RecognitionStatus: 'Success' }), { status: 422 });
});

test('WAV encoder produces valid PCM and clamps sample values', async () => {
  const buffer = await wav(new Float32Array([-2, -1, 0, 1, 2]));
  assert.doesNotThrow(() => validateWav(buffer));
  assert.equal(buffer.readUInt32LE(24), SAMPLE_RATE);
  assert.deepEqual(Array.from({ length: 5 }, (_, i) => buffer.readInt16LE(44 + i * 2)),
    [-32768, -32768, 0, 32767, 32767]);
});

test('rejects empty, corrupt, wrong-format, and overlong audio before Azure', async () => {
  assert.throws(() => validateWav(Buffer.alloc(0)), { status: 400 });
  assert.throws(() => validateWav(Buffer.from('not a WAV')), { status: 415 });
  const empty = await wav(new Float32Array(0));
  assert.throws(() => validateWav(empty), { status: 400 });
  const stereo = await wav();
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => validateWav(stereo), { status: 415 });
  const truncated = (await wav()).subarray(0, 50);
  assert.throws(() => validateWav(truncated), { status: 415 });
  const tooLong = await wav(new Float32Array(SAMPLE_RATE * 30 + 1));
  assert.throws(() => validateWav(tooLong), { status: 413 });
});

async function startApi(t, options) {
  const server = createApp(options).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}/api/pronunciation`;
}
const env = { AZURE_SPEECH_KEY: 'test-only-key', AZURE_SPEECH_REGION: 'eastus' };

test('API sends fixed scripted configuration and returns only normalized data', async (t) => {
  let calls = 0;
  const url = await startApi(t, { env, fetchAzure: async (endpoint, options) => {
    calls++;
    assert.match(endpoint, /^https:\/\/eastus\.stt\.speech\.microsoft\.com\//);
    assert.match(endpoint, /language=en-US&format=detailed/);
    assert.equal(options.headers['Ocp-Apim-Subscription-Key'], env.AZURE_SPEECH_KEY);
    const config = JSON.parse(Buffer.from(options.headers['Pronunciation-Assessment'], 'base64').toString());
    assert.deepEqual(config, {
      ReferenceText: REFERENCE_TEXT, GradingSystem: 'HundredMark', Granularity: 'Word',
      Dimension: 'Comprehensive', EnableMiscue: true, EnableProsodyAssessment: false,
    });
    validateWav(options.body);
    return Response.json(result());
  } });
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: await wav() });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), normalizeAssessment(result(), REFERENCE_TEXT));
  assert.equal(calls, 1);
});

test('API sends each phrase ID reference text in the actual Azure assessment configuration', async (t) => {
  const configurations = [];
  const url = await startApi(t, { env, fetchAzure: async (endpoint, options) => {
    configurations.push(JSON.parse(Buffer.from(options.headers['Pronunciation-Assessment'], 'base64').toString()));
    return Response.json(result());
  } });
  for (const phrase of PHRASES) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav', 'X-Phrase-Id': phrase.id },
      body: await wav(),
    });
    assert.equal(response.status, 200);
  }
  assert.deepEqual(configurations.map((config) => config.ReferenceText), PHRASES.map((phrase) => phrase.text));
});

test('sequential phrase requests preserve each newly recorded WAV body', async (t) => {
  const bodies = [];
  const phraseIds = [];
  const url = await startApi(t, { env, fetchAzure: async (endpoint, options) => {
    bodies.push(Buffer.from(options.body));
    phraseIds.push(JSON.parse(Buffer.from(options.headers['Pronunciation-Assessment'], 'base64').toString()).ReferenceText);
    return Response.json(result());
  } });
  const firstRecording = await wav(new Float32Array([0, 0.25, -0.25, 0.5]));
  const secondRecording = await wav(new Float32Array([0, -0.75, 0.75, -0.5]));
  for (const [phraseId, body] of [['library', firstRecording], ['comfortable', secondRecording]]) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav', 'X-Phrase-Id': phraseId },
      body,
    });
    assert.equal(response.status, 200);
  }
  assert.deepEqual(bodies, [firstRecording, secondRecording]);
  assert.deepEqual(phraseIds, ['Could you tell me where the library is?', 'This chair is very comfortable.']);
});

test('API handles missing credentials and rejects invalid uploads without calling Azure', async (t) => {
  const url = await startApi(t, { env: {}, fetchAzure: () => assert.fail('Must not call Azure') });
  for (const [body, contentType, status] of [
    [await wav(), 'audio/wav', 503], [Buffer.alloc(0), 'audio/wav', 400],
    ['invalid', 'audio/wav', 415], ['invalid', 'audio/webm', 415],
    [Buffer.alloc(1024 * 1024 + 1), 'audio/wav', 413],
  ]) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': contentType }, body });
    assert.equal(response.status, status);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('API maps Azure failures without leaking raw messages or credentials', async (t) => {
  let upstream;
  const url = await startApi(t, { env, fetchAzure: async () => {
    if (upstream instanceof Error) throw upstream;
    return upstream;
  } });
  const body = await wav();
  for (const [response, expected] of [
    [new Response('secret diagnostic', { status: 401 }), 503],
    [new Response('secret diagnostic', { status: 403 }), 503],
    [new Response('secret diagnostic', { status: 429 }), 429],
    [new Response('secret diagnostic', { status: 400 }), 422],
    [new Response('secret diagnostic', { status: 500 }), 502],
    [new Response('invalid JSON'), 502],
    [Response.json({ RecognitionStatus: 'NoMatch' }), 422],
    [new TypeError('secret diagnostic'), 502],
    [new DOMException('secret diagnostic', 'TimeoutError'), 504],
  ]) {
    upstream = response;
    const output = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body });
    assert.equal(output.status, expected);
    const message = (await output.json()).error;
    assert.doesNotMatch(message, /secret diagnostic|test-only-key/);
  }
});
