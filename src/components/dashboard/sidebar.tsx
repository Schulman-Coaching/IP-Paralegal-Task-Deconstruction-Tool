'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MemberRole, Organization } from '@prisma/client';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Mic,
  Settings,
  Users,
  Key,
  Webhook,
  BarChart3,
  CreditCard,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  organization: Organization & {
    _count: {
      members: number;
      cases: number;
      forms: number;
    };
  };
  userRole: MemberRole;
}

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/cases', icon: FolderKanban, label: 'Cases' },
  { href: '/recordings', icon: Mic, label: 'Recordings' },
  { href: '/forms', icon: FileText, label: 'Forms' },
];

const adminNavItems = [
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings/api-keys', icon: Key, label: 'API Keys' },
  { href: '/settings/webhooks', icon: Webhook, label: 'Webhooks' },
  { href: '/settings/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings/audit-log', icon: Shield, label: 'Audit Log' },
];

export function Sidebar({ organization, userRole }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  return (
    <aside className="w-64 bg-white border-r flex flex-col">
      {/* Organization Header */}
      <div className="h-16 border-b flex items-center px-4">
        <div className="flex items-center gap-3">
          {organization.logo ? (
            <img
              src={organization.logo}
              alt={organization.name}
              className="w-8 h-8 rounded-lg"
            />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="overflow-hidden">
            <p className="font-semibold text-sm truncate">{organization.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {organization.plan.toLowerCase()} plan
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Main
          </p>
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && (
          <div className="px-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Admin
            </p>
            <ul className="space-y-1">
              {adminNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Quick Stats */}
      <div className="border-t p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{organization._count.cases}</p>
            <p className="text-xs text-muted-foreground">Cases</p>
          </div>
          <div>
            <p className="text-lg font-bold">{organization._count.forms}</p>
            <p className="text-xs text-muted-foreground">Forms</p>
          </div>
          <div>
            <p className="text-lg font-bold">{organization._count.members}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
        </div>
      </div>

      {/* Settings Link */}
      <div className="border-t p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
