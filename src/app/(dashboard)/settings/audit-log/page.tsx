import { requireOrg, getCurrentOrganization, hasRole } from '@/lib/auth';
import { getAuditLogs } from '@/lib/audit';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Search,
  Filter,
  Download,
  User,
  Clock,
  Globe,
  ArrowRight,
} from 'lucide-react';

interface AuditLogPageProps {
  searchParams: {
    page?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
}

const actionLabels: Record<string, string> = {
  CASE_CREATED: 'Case Created',
  CASE_UPDATED: 'Case Updated',
  CASE_DELETED: 'Case Deleted',
  FORM_CREATED: 'Form Created',
  FORM_UPDATED: 'Form Updated',
  FORM_DELETED: 'Form Deleted',
  FORM_POPULATED: 'Form Auto-populated',
  RECORDING_CREATED: 'Recording Created',
  RECORDING_TRANSCRIBED: 'Recording Transcribed',
  RECORDING_ANALYZED: 'Recording Analyzed',
  MEMBER_INVITED: 'Member Invited',
  MEMBER_REMOVED: 'Member Removed',
  API_KEY_CREATED: 'API Key Created',
  API_KEY_REVOKED: 'API Key Revoked',
  WEBHOOK_CREATED: 'Webhook Created',
  WEBHOOK_DELETED: 'Webhook Deleted',
  SETTINGS_UPDATED: 'Settings Updated',
};

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  // Check admin access
  if (!hasRole(authUser.role, 'ADMIN')) {
    redirect('/dashboard');
  }

  const page = parseInt(searchParams.page || '1');
  const limit = 50;

  const { logs, total } = await getAuditLogs({
    organizationId: organization.id,
    action: searchParams.action,
    userId: searchParams.userId,
    startDate: searchParams.startDate ? new Date(searchParams.startDate) : undefined,
    endDate: searchParams.endDate ? new Date(searchParams.endDate) : undefined,
    page,
    limit,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">
            Track all actions and changes in your organization
          </p>
        </div>
        <Link
          href={`/api/audit/export?organizationId=${organization.id}`}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <form className="flex flex-wrap gap-4">
          <select
            name="action"
            defaultValue={searchParams.action || ''}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Actions</option>
            {Object.entries(actionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="startDate"
            defaultValue={searchParams.startDate}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Start Date"
          />
          <input
            type="date"
            name="endDate"
            defaultValue={searchParams.endDate}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="End Date"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </form>
      </div>

      {/* Audit Log List */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">No audit logs found</h2>
          <p className="text-muted-foreground">
            {searchParams.action || searchParams.startDate || searchParams.endDate
              ? 'Try adjusting your filters'
              : 'Actions will appear here as they occur'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Action
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  User
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Resource
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Details
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  IP Address
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => {
                const details = log.details as Record<string, any> | null;
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-sm">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground truncate max-w-[100px]">
                          {log.userId?.substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.resourceType && log.resourceId ? (
                        <span className="text-sm text-muted-foreground">
                          {log.resourceType}:{log.resourceId.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {details ? (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {JSON.stringify(details).substring(0, 50)}
                          {JSON.stringify(details).length > 50 && '...'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        {log.ipAddress || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/settings/audit-log?page=${page - 1}${searchParams.action ? `&action=${searchParams.action}` : ''}${searchParams.startDate ? `&startDate=${searchParams.startDate}` : ''}${searchParams.endDate ? `&endDate=${searchParams.endDate}` : ''}`}
                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/settings/audit-log?page=${page + 1}${searchParams.action ? `&action=${searchParams.action}` : ''}${searchParams.startDate ? `&startDate=${searchParams.startDate}` : ''}${searchParams.endDate ? `&endDate=${searchParams.endDate}` : ''}`}
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
