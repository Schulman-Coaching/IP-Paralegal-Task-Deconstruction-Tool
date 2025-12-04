import { requireOrg, getCurrentOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  FileText,
  Sparkles,
  Clock,
  HardDrive,
  Link2,
  Edit,
  Trash2,
} from 'lucide-react';
import { RecordingStatus } from '@prisma/client';
import { RecordingActions } from './recording-actions';

interface RecordingDetailPageProps {
  params: { id: string };
}

const statusColors: Record<RecordingStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default async function RecordingDetailPage({ params }: RecordingDetailPageProps) {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  const recording = await db.recording.findFirst({
    where: { id: params.id, organizationId: organization.id },
    include: {
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  if (!recording) {
    notFound();
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const analysis = recording.analysis as Record<string, any> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/recordings"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{recording.title}</h1>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${statusColors[recording.status]}`}
              >
                {recording.status}
              </span>
            </div>
            <p className="text-muted-foreground">
              Recorded on {new Date(recording.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition">
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Play className="w-5 h-5 text-primary" />
              Audio Player
            </h2>
            {recording.fileUrl ? (
              <audio src={recording.fileUrl} controls className="w-full" />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Audio file not available
              </p>
            )}
          </div>

          {/* Transcription */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Transcription
              </h2>
              <RecordingActions
                recordingId={recording.id}
                hasTranscription={!!recording.transcription}
                hasAnalysis={!!recording.analysis}
                status={recording.status}
              />
            </div>
            {recording.transcription ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{recording.transcription}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {recording.status === 'PROCESSING'
                  ? 'Transcription in progress...'
                  : 'No transcription yet. Click "Transcribe" to generate one.'}
              </p>
            )}
          </div>

          {/* Analysis */}
          {recording.transcription && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Analysis
                </h2>
              </div>
              {analysis ? (
                <div className="space-y-6">
                  {analysis.inventionDescription && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Invention/Work Description</h3>
                      <p className="text-sm text-muted-foreground">{analysis.inventionDescription}</p>
                    </div>
                  )}

                  {analysis.inventors && analysis.inventors.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Inventors/Creators</h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {analysis.inventors.map((inventor: string, i: number) => (
                          <li key={i}>{inventor}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.keyDates && analysis.keyDates.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Key Dates</h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {analysis.keyDates.map((date: any, i: number) => (
                          <li key={i}>{typeof date === 'string' ? date : JSON.stringify(date)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.claims && analysis.claims.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Claims/Rights</h3>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground">
                        {analysis.claims.map((claim: string, i: number) => (
                          <li key={i}>{claim}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {analysis.actionItems && analysis.actionItems.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Action Items</h3>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {analysis.actionItems.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.suggestedFormType && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Suggested Form Type</h3>
                      <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded">
                        {analysis.suggestedFormType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No analysis yet. Click &quot;Analyze&quot; to generate AI insights.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recording Details */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(recording.duration)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">File Size</p>
                  <p className="font-medium">{formatFileSize(recording.fileSize)}</p>
                </div>
              </div>
              {recording.case && (
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Linked Case</p>
                    <Link
                      href={`/cases/${recording.case.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {recording.case.caseNumber}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {recording.transcription && recording.analysis && (
                <Link
                  href={`/forms/new?recordingId=${recording.id}${recording.caseId ? `&caseId=${recording.caseId}` : ''}`}
                  className="flex items-center gap-2 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Create Form from Analysis
                </Link>
              )}
              {!recording.case && (
                <button className="flex items-center gap-2 w-full px-4 py-2 border rounded-lg hover:bg-slate-50 transition text-sm">
                  <Link2 className="w-4 h-4" />
                  Link to Case
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
