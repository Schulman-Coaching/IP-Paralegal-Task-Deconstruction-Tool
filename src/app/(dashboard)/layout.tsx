import { redirect } from 'next/navigation';
import { requireOrg, getCurrentOrganization } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await requireOrg();
  const organization = await getCurrentOrganization();

  if (!organization) {
    redirect('/select-org');
  }

  return (
    <div className="h-screen flex">
      <Sidebar organization={organization} userRole={authUser.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header organization={organization} />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
