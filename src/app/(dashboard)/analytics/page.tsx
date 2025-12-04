import { requireOrg, getCurrentOrganization, hasRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  FileText,
  Mic,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';
import { CaseStatus, CaseType } from '@prisma/client';

export default async function AnalyticsPage() {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  // Check admin access
  if (!hasRole(authUser.role, 'ADMIN')) {
    redirect('/dashboard');
  }

  // Get date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Fetch analytics data
  const [
    // Current period stats
    totalCases,
    totalForms,
    totalRecordings,
    totalMembers,
    casesThisPeriod,
    formsThisPeriod,
    recordingsThisPeriod,

    // Previous period stats for comparison
    casesPrevPeriod,
    formsPrevPeriod,
    recordingsPrevPeriod,

    // Cases by status
    casesByStatus,

    // Cases by type
    casesByType,

    // Recent activity count
    activityCount,

    // Top users by activity
    topUsers,
  ] = await Promise.all([
    db.case.count({ where: { organizationId: organization.id } }),
    db.form.count({ where: { organizationId: organization.id } }),
    db.recording.count({ where: { organizationId: organization.id } }),
    db.member.count({ where: { organizationId: organization.id } }),

    // Current period
    db.case.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    db.form.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    db.recording.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Previous period
    db.case.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    db.form.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    db.recording.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),

    // Cases by status
    db.case.groupBy({
      by: ['status'],
      where: { organizationId: organization.id },
      _count: true,
    }),

    // Cases by type
    db.case.groupBy({
      by: ['type'],
      where: { organizationId: organization.id },
      _count: true,
    }),

    // Activity count
    db.activity.count({
      where: {
        case: { organizationId: organization.id },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Top users
    db.activity.groupBy({
      by: ['userId'],
      where: {
        case: { organizationId: organization.id },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    }),
  ]);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const casesChange = calculateChange(casesThisPeriod, casesPrevPeriod);
  const formsChange = calculateChange(formsThisPeriod, formsPrevPeriod);
  const recordingsChange = calculateChange(recordingsThisPeriod, recordingsPrevPeriod);

  // Process status data for chart
  const statusData = Object.values(CaseStatus).map((status) => {
    const item = casesByStatus.find((s) => s.status === status);
    return {
      status,
      count: item?._count || 0,
    };
  });

  // Process type data for chart
  const typeData = Object.values(CaseType).map((type) => {
    const item = casesByType.find((t) => t.type === type);
    return {
      type,
      count: item?._count || 0,
    };
  });

  const statusColors: Record<CaseStatus, string> = {
    OPEN: 'bg-blue-500',
    IN_PROGRESS: 'bg-yellow-500',
    PENDING_CLIENT: 'bg-purple-500',
    PENDING_OFFICE: 'bg-orange-500',
    CLOSED: 'bg-green-500',
    ARCHIVED: 'bg-gray-500',
  };

  const typeColors: Record<CaseType, string> = {
    PATENT: 'bg-blue-500',
    TRADEMARK: 'bg-green-500',
    COPYRIGHT: 'bg-purple-500',
    TRADE_SECRET: 'bg-orange-500',
    OTHER: 'bg-gray-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Overview of your organization&apos;s IP case management metrics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FolderKanban className="w-5 h-5" />}
          label="Total Cases"
          value={totalCases}
          change={casesChange}
          period="vs last 30 days"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Total Forms"
          value={totalForms}
          change={formsChange}
          period="vs last 30 days"
        />
        <StatCard
          icon={<Mic className="w-5 h-5" />}
          label="Total Recordings"
          value={totalRecordings}
          change={recordingsChange}
          period="vs last 30 days"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Team Members"
          value={totalMembers}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cases by Status */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Cases by Status</h2>
          <div className="space-y-4">
            {statusData.map((item) => {
              const percentage = totalCases > 0 ? (item.count / totalCases) * 100 : 0;
              return (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.status.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${statusColors[item.status]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cases by Type */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Cases by Type</h2>
          <div className="space-y-4">
            {typeData.map((item) => {
              const percentage = totalCases > 0 ? (item.count / totalCases) * 100 : 0;
              return (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${typeColors[item.type]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Summary */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Activity (30 days)
          </h2>
          <div className="text-center py-4">
            <p className="text-4xl font-bold">{activityCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Total activities</p>
          </div>
        </div>

        {/* Upcoming Deadlines Summary */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Deadline Overview
          </h2>
          <DeadlinesSummary organizationId={organization.id} />
        </div>

        {/* Top Contributors */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Top Contributors
          </h2>
          {topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity data available
            </p>
          ) : (
            <ul className="space-y-3">
              {topUsers.map((user, index) => (
                <li key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {user.userId.substring(0, 8)}...
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user._count} activities</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Monthly Trend Placeholder */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Monthly Trends
        </h2>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">
            Detailed charts available in the full analytics dashboard.
            Integrate with a charting library like Chart.js or Recharts for visualization.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
  period,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  change?: number;
  period?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {period && <p className="text-xs text-muted-foreground mt-1">{period}</p>}
    </div>
  );
}

async function DeadlinesSummary({ organizationId }: { organizationId: string }) {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [urgent, upcoming, overdue] = await Promise.all([
    db.case.count({
      where: {
        organizationId,
        filingDeadline: { gte: now, lte: sevenDays },
        status: { notIn: ['CLOSED', 'ARCHIVED'] },
      },
    }),
    db.case.count({
      where: {
        organizationId,
        filingDeadline: { gt: sevenDays, lte: thirtyDays },
        status: { notIn: ['CLOSED', 'ARCHIVED'] },
      },
    }),
    db.case.count({
      where: {
        organizationId,
        filingDeadline: { lt: now },
        status: { notIn: ['CLOSED', 'ARCHIVED'] },
      },
    }),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-red-600">Overdue</span>
        <span className="font-medium text-red-600">{overdue}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-orange-600">Within 7 days</span>
        <span className="font-medium text-orange-600">{urgent}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Within 30 days</span>
        <span className="font-medium">{upcoming}</span>
      </div>
    </div>
  );
}
