import React, { useState, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, Check } from 'lucide-react';
import { useReactMediaRecorder } from 'react-media-recorder';
import Button from './Button';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, audioUrl: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  disabled = false,
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    video: false,
    blobPropertyBag: {
      type: 'audio/webm;codecs=opus',
    },
    onStop: (blobUrl, blob) => {
      // Ensure blob has correct MIME type
      const properBlob = new Blob([blob], { type: 'audio/webm;codecs=opus' });
      setRecordedAudioUrl(blobUrl);
      setRecordedBlob(properBlob);
    },
  });

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (status === 'recording') {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
      if (status === 'stopped') {
        setRecordingTime(0);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const handleStartRecording = () => {
    setRecordingTime(0);
    setRecordedAudioUrl(null);
    setRecordedBlob(null);
    clearBlobUrl();
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleReRecord = () => {
    setRecordingTime(0);
    setRecordedAudioUrl(null);
    setRecordedBlob(null);
    clearBlobUrl();
  };

  const handleConfirm = () => {
    if (recordedBlob && recordedAudioUrl) {
      onRecordingComplete(recordedBlob, recordedAudioUrl);
    }
  };

  const handleCancel = () => {
    handleReRecord();
    if (onCancel) {
      onCancel();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
      {/* Recording Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'recording' && (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-semibold">Recording...</span>
            </>
          )}
          {status === 'stopped' && recordedAudioUrl && (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-white font-semibold">Recording Complete</span>
            </>
          )}
          {status === 'idle' && !recordedAudioUrl && (
            <>
              <Mic className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400">Ready to record</span>
            </>
          )}
        </div>
        
        {/* Timer */}
        {(status === 'recording' || recordingTime > 0) && (
          <div className="text-white font-mono text-lg">
            {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {/* Waveform Visualization (Simple bars) */}
      {status === 'recording' && (
        <div className="flex items-center justify-center gap-1 h-16">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-indigo-500 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 60 + 20}%`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Audio Playback */}
      {recordedAudioUrl && status === 'stopped' && (
        <div className="space-y-3">
          <audio
            src={recordedAudioUrl}
            controls
            className="w-full"
            style={{
              filter: 'invert(1) hue-rotate(180deg)',
            }}
          />
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {status === 'idle' && !recordedAudioUrl && (
          <Button
            onClick={handleStartRecording}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </Button>
        )}

        {status === 'recording' && (
          <Button
            onClick={handleStopRecording}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </Button>
        )}

        {status === 'stopped' && recordedAudioUrl && (
          <>
            <Button
              onClick={handleReRecord}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Re-record
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Use This Recording
            </Button>
          </>
        )}

        {onCancel && (
          <Button
            onClick={handleCancel}
            variant="secondary"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-400 text-center">
        {status === 'idle' && !recordedAudioUrl && 'Click "Start Recording" to record your voice answer'}
        {status === 'recording' && 'Speak clearly into your microphone'}
        {status === 'stopped' && recordedAudioUrl && 'Review your recording and confirm or re-record'}
      </p>
    </div>
  );
};

export default VoiceRecorder;
