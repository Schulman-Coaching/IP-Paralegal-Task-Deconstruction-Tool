import { requireOrg, getCurrentOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  FolderKanban,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { CaseStatus, CaseType } from '@prisma/client';

interface CasesPageProps {
  searchParams: {
    page?: string;
    status?: CaseStatus;
    type?: CaseType;
    search?: string;
  };
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

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  const page = parseInt(searchParams.page || '1');
  const limit = 20;

  const where: any = { organizationId: organization.id };

  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { caseNumber: { contains: searchParams.search, mode: 'insensitive' } },
      { clientName: { contains: searchParams.search, mode: 'insensitive' } },
    ];
  }

  const [cases, total] = await Promise.all([
    db.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { forms: true, recordings: true, documents: true },
        },
      },
    }),
    db.case.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cases</h1>
          <p className="text-muted-foreground">
            Manage your intellectual property cases
          </p>
        </div>
        <Link
          href="/cases/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          <Plus className="w-5 h-5" />
          New Case
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
                placeholder="Search cases..."
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
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_CLIENT">Pending Client</option>
            <option value="PENDING_OFFICE">Pending Office</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            name="type"
            defaultValue={searchParams.type || ''}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Types</option>
            <option value="PATENT">Patent</option>
            <option value="TRADEMARK">Trademark</option>
            <option value="COPYRIGHT">Copyright</option>
            <option value="TRADE_SECRET">Trade Secret</option>
            <option value="OTHER">Other</option>
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

      {/* Cases List */}
      {cases.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">No cases found</h2>
          <p className="text-muted-foreground mb-4">
            {searchParams.search || searchParams.status || searchParams.type
              ? 'Try adjusting your filters'
              : 'Get started by creating your first case'}
          </p>
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="w-5 h-5" />
            Create Case
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Case
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Client
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Deadline
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Items
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link href={`/cases/${caseItem.id}`} className="block">
                      <p className="font-medium text-sm">{caseItem.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {caseItem.caseNumber}
                      </p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{typeLabels[caseItem.type]}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${statusColors[caseItem.status]}`}
                    >
                      {caseItem.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{caseItem.clientName || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    {caseItem.filingDeadline ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {new Date(caseItem.filingDeadline).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{caseItem._count.forms} forms</span>
                      <span>{caseItem._count.recordings} recordings</span>
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
                {Math.min(page * limit, total)} of {total} cases
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/cases?page=${page - 1}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.type ? `&type=${searchParams.type}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/cases?page=${page + 1}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.type ? `&type=${searchParams.type}` : ''}${searchParams.search ? `&search=${searchParams.search}` : ''}`}
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
