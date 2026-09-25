import { useState } from 'react';

export default function RecordingPlayer({ src, labelledBy, playerRef }) {
  const [metadataReady, setMetadataReady] = useState(false);
  const [message, setMessage] = useState('Loading recording…');

  function readMetadata(event) {
    const duration = event.currentTarget.duration;
    // Use the actual media duration, not the recording timer.
    if (Number.isFinite(duration) && duration > 0) {
      setMetadataReady(true);
      setMessage('');
    }
  }

  return (
    <>
      <audio
        ref={playerRef}
        controls
        preload="metadata"
        src={src}
        aria-labelledby={labelledBy}
        aria-busy={!metadataReady && message === 'Loading recording…'}
        onLoadedMetadata={readMetadata}
        onDurationChange={readMetadata}
        onError={() => {
          setMetadataReady(false);
          setMessage('This recording could not be played. Please try recording again.');
        }}
      />
      {message && <p className="audio-message" role="status">{message}</p>}
    </>
  );
}
