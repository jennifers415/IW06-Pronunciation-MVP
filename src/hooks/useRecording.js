import { useEffect, useRef, useState } from 'react';
import { recordingToWav } from '../audio.js';

const BUSY_STATUSES = ['requesting', 'recording', 'stopping', 'analyzing'];

export default function useRecording({ onNewRecording }) {
  const [status, setStatus] = useState('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const recordingRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const urlRef = useRef('');
  const requestRef = useRef(0);
  const busy = BUSY_STATUSES.includes(status);

  function clearDraftRecording() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
    setAudioUrl('');
    recordingRef.current = null;
  }

  useEffect(() => () => {
    requestRef.current += 1;
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function startRecording() {
    if (busy) return;
    onNewRecording?.();
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Recording is unavailable here. Open this page over HTTPS or localhost in a browser that supports microphone recording.');
      return;
    }
    setStatus('requesting');
    const request = ++requestRef.current;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      const chunks = [];
      let failed = false;
      recorder.ondataavailable = ({ data }) => {
        if (data.size > 0) chunks.push(data);
        if (import.meta.env.DEV) console.debug('[recording] MediaRecorder chunk', { size: data.size, type: data.type });
      };
      recorder.onerror = () => {
        failed = true;
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setError('Recording was interrupted. Please try recording again.');
        setStatus('idle');
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (request !== requestRef.current) return;
        streamRef.current = null;
        recorderRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || '' });
        if (import.meta.env.DEV) console.debug('[recording] MediaRecorder complete', { chunkCount: chunks.length, bytes: blob.size, type: blob.type });
        if (!failed && blob.size > 0) {
          setStatus('stopping');
          try {
            const wav = await recordingToWav(blob);
            if (request !== requestRef.current) return;
            clearDraftRecording();
            recordingRef.current = wav;
            if (import.meta.env.DEV) console.debug('[recording] WAV ready for analysis', { bytes: wav.size, type: wav.type });
            urlRef.current = URL.createObjectURL(wav);
            setAudioUrl(urlRef.current);
            setStatus('ready');
          } catch (err) {
            if (request !== requestRef.current) return;
            clearDraftRecording();
            setError(err.message || 'This recording could not be read. Please record again.');
            setStatus('idle');
          }
        } else {
          setError('No recording was saved. Please try recording again.');
          setStatus('idle');
        }
      };
      recorder.start(1000);
      clearDraftRecording();
      setStatus('recording');
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      if (request !== requestRef.current) return;
      streamRef.current = null;
      recorderRef.current = null;
      const messages = {
        NotAllowedError: 'Microphone access was not allowed. Allow it in your browser’s site settings, then try again.',
        NotFoundError: 'No microphone was found. Connect a microphone, then try again.',
        NotReadableError: 'Your microphone could not be opened. Check whether another app is using it, then try again.',
      };
      setError(messages[err.name] || 'Recording could not start. Check your microphone and try again.');
      setStatus('idle');
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      setStatus('stopping');
      recorder.stop();
    }
  }

  return { status, setStatus, audioUrl, error, setError, busy, recordingRef, recorderRef, streamRef, urlRef, requestRef, clearDraftRecording, startRecording, stopRecording };
}
