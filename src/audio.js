import { MAX_AUDIO_SECONDS, SAMPLE_RATE } from '../shared/assessment.js';

// Encode mono samples as signed 16-bit PCM in a WAV container.
export function encodeWav(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    const value = Number.isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0;
    view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  });
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function recordingToWav(blob) {
  if (!blob?.size) throw new Error('Your recording is empty. Please record again.');
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) throw new Error('This browser cannot prepare audio for assessment. Try Safari or Chrome on your computer.');
  let decoded;
  try {
    const decoder = new OfflineContext(1, 1, SAMPLE_RATE);
    decoded = await decoder.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error('This recording’s audio format could not be read. Please record again or try another browser.');
  }
  if (!decoded.length || !Number.isFinite(decoded.duration) || decoded.duration <= 0) {
    throw new Error('Your recording is empty. Please record again.');
  }
  if (decoded.duration > MAX_AUDIO_SECONDS) {
    throw new Error(`Please record a shorter clip (up to ${MAX_AUDIO_SECONDS} seconds).`);
  }
  // Offline rendering downmixes channels and resamples without playing the clip.
  const context = new OfflineContext(1, Math.ceil(decoded.duration * SAMPLE_RATE), SAMPLE_RATE);
  const source = context.createBufferSource();
  source.buffer = decoded;
  source.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  return encodeWav(rendered.getChannelData(0));
}
