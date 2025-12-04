'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import { RecordingStatus } from '@prisma/client';

interface RecordingActionsProps {
  recordingId: string;
  hasTranscription: boolean;
  hasAnalysis: boolean;
  status: RecordingStatus;
}

export function RecordingActions({
  recordingId,
  hasTranscription,
  hasAnalysis,
  status,
}: RecordingActionsProps) {
  const router = useRouter();
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleTranscribe = async () => {
    setTranscribing(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/recordings/${recordingId}/transcribe`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transcribe');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleAnalyze = async (provider: 'openai' | 'anthropic') => {
    setAnalyzing(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/recordings/${recordingId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const isProcessing = status === 'PROCESSING';

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}

      {!hasTranscription && !isProcessing && (
        <button
          onClick={handleTranscribe}
          disabled={transcribing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          {transcribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcribing...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Transcribe
            </>
          )}
        </button>
      )}

      {hasTranscription && !hasAnalysis && (
        <div className="relative group">
          <button
            disabled={analyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze
              </>
            )}
          </button>

          {!analyzing && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleAnalyze('openai')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-t-lg"
              >
                Analyze with GPT-4
              </button>
              <button
                onClick={() => handleAnalyze('anthropic')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-b-lg"
              >
                Analyze with Claude
              </button>
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </span>
      )}
    </div>
  );
}
