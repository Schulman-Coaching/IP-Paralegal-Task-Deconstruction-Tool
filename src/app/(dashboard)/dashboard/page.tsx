import { requireOrg, getCurrentOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlanFeatures } from '@/lib/stripe';
import {
  FolderKanban,
  FileText,
  Mic,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  // Get dashboard stats
  const [
    totalCases,
    openCases,
    pendingForms,
    recentRecordings,
    recentActivity,
  ] = await Promise.all([
    db.case.count({ where: { organizationId: organization.id } }),
    db.case.count({
      where: {
        organizationId: organization.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT'] },
      },
    }),
    db.form.count({
      where: {
        organizationId: organization.id,
        status: { in: ['DRAFT', 'IN_REVIEW'] },
      },
    }),
    db.recording.count({
      where: {
        organizationId: organization.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    db.activity.findMany({
      where: {
        case: { organizationId: organization.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        case: { select: { title: true, caseNumber: true } },
      },
    }),
  ]);

  const planFeatures = getPlanFeatures(organization.plan);

  // Get upcoming deadlines
  const upcomingDeadlines = await db.case.findMany({
    where: {
      organizationId: organization.id,
      filingDeadline: {
        gte: new Date(),
        lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Next 14 days
      },
      status: { notIn: ['CLOSED', 'ARCHIVED'] },
    },
    orderBy: { filingDeadline: 'asc' },
    take: 5,
    select: {
      id: true,
      caseNumber: true,
      title: true,
      filingDeadline: true,
      type: true,
    },
  });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your IP cases today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FolderKanban className="w-5 h-5" />}
          label="Total Cases"
          value={totalCases}
          trend={`${openCases} active`}
          href="/cases"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Pending Forms"
          value={pendingForms}
          trend="Needs review"
          href="/forms"
        />
        <StatCard
          icon={<Mic className="w-5 h-5" />}
          label="Recordings (30d)"
          value={recentRecordings}
          trend={`of ${planFeatures.maxRecordingsPerMonth === -1 ? '∞' : planFeatures.maxRecordingsPerMonth}`}
          href="/recordings"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Team Members"
          value={organization._count.members}
          trend={`of ${planFeatures.maxMembers === -1 ? '∞' : planFeatures.maxMembers}`}
          href="/team"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Upcoming Deadlines
            </h2>
            <Link
              href="/cases?filter=deadline"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No upcoming deadlines in the next 14 days</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingDeadlines.map((deadline) => {
                const daysUntil = Math.ceil(
                  (deadline.filingDeadline!.getTime() - Date.now()) /
                    (24 * 60 * 60 * 1000)
                );
                const isUrgent = daysUntil <= 3;

                return (
                  <li key={deadline.id}>
                    <Link
                      href={`/cases/${deadline.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition"
                    >
                      <div>
                        <p className="font-medium text-sm">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {deadline.caseNumber} • {deadline.type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          isUrgent
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {daysUntil === 0
                          ? 'Today'
                          : daysUntil === 1
                          ? 'Tomorrow'
                          : `${daysUntil} days`}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.case.caseNumber}</span>
                      {' - '}
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
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction
            href="/cases/new"
            icon={<FolderKanban className="w-5 h-5" />}
            label="New Case"
          />
          <QuickAction
            href="/recordings/new"
            icon={<Mic className="w-5 h-5" />}
            label="Record Audio"
          />
          <QuickAction
            href="/forms/new"
            icon={<FileText className="w-5 h-5" />}
            label="Create Form"
          />
          <QuickAction
            href="/team/invite"
            icon={<Users className="w-5 h-5" />}
            label="Invite Member"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  trend: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-6 hover:shadow-md transition group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{trend}</p>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-slate-50 hover:border-primary transition"
    >
      <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
