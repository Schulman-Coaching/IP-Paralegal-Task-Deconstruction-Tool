'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export default function NewRecordingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get('caseId');

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (err: any) {
      setError('Could not access microphone. Please ensure you have granted permission.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingState('stopped');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setRecordingState('idle');
    setDuration(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    chunksRef.current = [];
  };

  const handleSave = async () => {
    if (!audioBlob || !title.trim()) {
      setError('Please provide a title for the recording');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Create recording metadata
      const response = await fetch('/api/v1/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          caseId: caseId || undefined,
          duration,
          fileSize: audioBlob.size,
          mimeType: audioBlob.type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create recording');
      }

      const recording = await response.json();

      // In a real app, you would upload to a storage service like S3/GCS
      // For now, we'll simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      router.push(`/recordings/${recording.id}`);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/recordings"
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Recording</h1>
          <p className="text-muted-foreground">Record audio for transcription and analysis</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Recording Interface */}
      <div className="bg-white rounded-xl border p-8">
        {/* Timer Display */}
        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold mb-2">{formatTime(duration)}</div>
          <p className="text-muted-foreground">
            {recordingState === 'idle' && 'Ready to record'}
            {recordingState === 'recording' && 'Recording...'}
            {recordingState === 'paused' && 'Paused'}
            {recordingState === 'stopped' && 'Recording complete'}
          </p>
        </div>

        {/* Waveform Visualization Placeholder */}
        {recordingState === 'recording' && (
          <div className="flex items-center justify-center gap-1 h-16 mb-8">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Audio Player */}
        {audioUrl && recordingState === 'stopped' && (
          <div className="mb-8">
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {recordingState === 'idle' && (
            <button
              onClick={startRecording}
              className="flex items-center justify-center w-20 h-20 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
            >
              <Mic className="w-8 h-8" />
            </button>
          )}

          {recordingState === 'recording' && (
            <>
              <button
                onClick={pauseRecording}
                className="flex items-center justify-center w-14 h-14 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition"
              >
                <Pause className="w-6 h-6" />
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-20 h-20 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
              >
                <Square className="w-8 h-8" />
              </button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <button
                onClick={resumeRecording}
                className="flex items-center justify-center w-14 h-14 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
              >
                <Play className="w-6 h-6" />
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center justify-center w-20 h-20 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
              >
                <Square className="w-8 h-8" />
              </button>
            </>
          )}

          {recordingState === 'stopped' && (
            <>
              <button
                onClick={resetRecording}
                className="flex items-center justify-center w-14 h-14 border-2 border-slate-300 text-slate-600 rounded-full hover:bg-slate-50 transition"
              >
                <Mic className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Save Form */}
      {recordingState === 'stopped' && audioBlob && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Recording Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Client Interview - Patent Discussion"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {caseId && (
            <p className="text-sm text-muted-foreground">
              This recording will be linked to the selected case.
            </p>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Link
              href="/recordings"
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={uploading || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Save Recording
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 rounded-xl border p-6">
        <h3 className="font-semibold mb-3">Recording Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
            Speak clearly and at a moderate pace for best transcription results
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
            Find a quiet environment to minimize background noise
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
            State key information like names, dates, and technical terms clearly
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5" />
            After saving, you can transcribe and analyze the recording with AI
          </li>
        </ul>
      </div>
    </div>
  );
}
