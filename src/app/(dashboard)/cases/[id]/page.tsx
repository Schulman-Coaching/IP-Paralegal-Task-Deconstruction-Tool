import { requireOrg, getCurrentOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  FileText,
  Mic,
  Files,
  Edit,
  Trash2,
  Plus,
  Calendar,
  User,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { CaseStatus, CaseType } from '@prisma/client';

interface CaseDetailPageProps {
  params: { id: string };
}

const statusColors: Record<CaseStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  PENDING_CLIENT: 'bg-purple-100 text-purple-700',
  PENDING_OFFICE: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-700',
};

const typeLabels: Record<CaseType, string> = {
  PATENT: 'Patent',
  TRADEMARK: 'Trademark',
  COPYRIGHT: 'Copyright',
  TRADE_SECRET: 'Trade Secret',
  OTHER: 'Other',
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  const caseData = await db.case.findFirst({
    where: { id: params.id, organizationId: organization.id },
    include: {
      forms: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      recordings: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      documents: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!caseData) {
    notFound();
  }

  const daysUntilDeadline = caseData.filingDeadline
    ? Math.ceil(
        (caseData.filingDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/cases"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{caseData.title}</h1>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${statusColors[caseData.status]}`}
              >
                {caseData.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-muted-foreground">
              {caseData.caseNumber} • {typeLabels[caseData.type]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/cases/${caseData.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Deadline Alert */}
      {daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline >= 0 && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${daysUntilDeadline <= 3 ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
          <AlertCircle className={`w-5 h-5 ${daysUntilDeadline <= 3 ? 'text-red-500' : 'text-orange-500'}`} />
          <p className={`font-medium ${daysUntilDeadline <= 3 ? 'text-red-700' : 'text-orange-700'}`}>
            Filing deadline in {daysUntilDeadline === 0 ? 'today' : daysUntilDeadline === 1 ? 'tomorrow' : `${daysUntilDeadline} days`}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Details */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Case Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium">{caseData.clientName || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{caseData.clientEmail || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Filing Deadline</p>
                    <p className="font-medium">
                      {caseData.filingDeadline
                        ? new Date(caseData.filingDeadline).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(caseData.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {caseData.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{caseData.description}</p>
              </div>
            )}
          </div>

          {/* Forms */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Forms ({caseData.forms.length})
              </h2>
              <Link
                href={`/forms/new?caseId=${caseData.id}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add Form
              </Link>
            </div>
            {caseData.forms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No forms yet
              </p>
            ) : (
              <ul className="space-y-2">
                {caseData.forms.map((form) => (
                  <li key={form.id}>
                    <Link
                      href={`/forms/${form.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-medium text-sm">{form.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {form.type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          form.status === 'SUBMITTED'
                            ? 'bg-green-100 text-green-700'
                            : form.status === 'DRAFT'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {form.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recordings */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Recordings ({caseData.recordings.length})
              </h2>
              <Link
                href={`/recordings/new?caseId=${caseData.id}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add Recording
              </Link>
            </div>
            {caseData.recordings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recordings yet
              </p>
            ) : (
              <ul className="space-y-2">
                {caseData.recordings.map((recording) => (
                  <li key={recording.id}>
                    <Link
                      href={`/recordings/${recording.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-medium text-sm">{recording.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(recording.duration / 60)}:
                          {String(recording.duration % 60).padStart(2, '0')} •{' '}
                          {new Date(recording.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          recording.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700'
                            : recording.status === 'PROCESSING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : recording.status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {recording.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Files className="w-5 h-5 text-primary" />
                Documents ({caseData.documents.length})
              </h2>
              <button className="flex items-center gap-1 text-sm text-primary hover:underline">
                <Plus className="w-4 h-4" />
                Upload
              </button>
            </div>
            {caseData.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No documents yet
              </p>
            ) : (
              <ul className="space-y-2">
                {caseData.documents.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.fileSize / 1024).toFixed(1)} KB •{' '}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar - Activity */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Recent Activity</h2>
            {caseData.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No activity yet
              </p>
            ) : (
              <ul className="space-y-4">
                {caseData.activities.map((activity) => (
                  <li key={activity.id} className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {activity.content || activity.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Forms</span>
                <span className="font-medium">{caseData.forms.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recordings</span>
                <span className="font-medium">{caseData.recordings.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents</span>
                <span className="font-medium">{caseData.documents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Activities</span>
                <span className="font-medium">{caseData.activities.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
