import { SidebarShell } from "@/components/layout/sidebar-shell";
import { CreditBalance } from "@/components/layout/credit-balance";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden lg:flex-row">
      <SidebarShell creditSlot={<CreditBalance />} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
