import { requireOrg, getCurrentOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Mic,
  Play,
  FileText,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import { RecordingStatus } from '@prisma/client';

interface RecordingsPageProps {
  searchParams: {
    page?: string;
    status?: RecordingStatus;
    caseId?: string;
    search?: string;
  };
}

const statusColors: Record<RecordingStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default async function RecordingsPage({ searchParams }: RecordingsPageProps) {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  const page = parseInt(searchParams.page || '1');
  const limit = 20;

  const where: any = { organizationId: organization.id };

  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.caseId) where.caseId = searchParams.caseId;
  if (searchParams.search) {
    where.title = { contains: searchParams.search, mode: 'insensitive' };
  }

  const [recordings, total] = await Promise.all([
    db.recording.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
      },
    }),
    db.recording.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recordings</h1>
          <p className="text-muted-foreground">
            Manage audio recordings and transcriptions
          </p>
        </div>
        <Link
          href="/recordings/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          <Mic className="w-5 h-5" />
          New Recording
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <form className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                name="search"
                placeholder="Search recordings..."
                defaultValue={searchParams.search}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <select
            name="status"
            defaultValue={searchParams.status || ''}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </form>
      </div>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">No recordings found</h2>
          <p className="text-muted-foreground mb-4">
            {searchParams.search || searchParams.status
              ? 'Try adjusting your filters'
              : 'Get started by creating your first recording'}
          </p>
          <Link
            href="/recordings/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Recording
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Case
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Duration
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Size
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recordings.map((recording) => (
                <tr
                  key={recording.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link href={`/recordings/${recording.id}`} className="block">
                      <p className="font-medium text-sm">{recording.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(recording.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {recording.case ? (
                      <Link
                        href={`/cases/${recording.case.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {recording.case.caseNumber}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{formatDuration(recording.duration)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{formatFileSize(recording.fileSize)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${statusColors[recording.status]}`}
                    >
                      {recording.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {recording.fileUrl && (
                        <button
                          className="p-1.5 hover:bg-slate-100 rounded"
                          title="Play"
                        >
                          <Play className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      {recording.transcription && (
                        <button
                          className="p-1.5 hover:bg-slate-100 rounded"
                          title="View Transcription"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      {recording.status === 'COMPLETED' && !recording.analysis && (
                        <button
                          className="p-1.5 hover:bg-slate-100 rounded"
                          title="Analyze"
                        >
                          <Sparkles className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, total)} of {total} recordings
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/recordings?page=${page - 1}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/recordings?page=${page + 1}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
