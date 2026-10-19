import { SidebarShell } from "@/components/layout/sidebar-shell";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarShell />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
