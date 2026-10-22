import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin/guard";
import { listUsersAdmin } from "@/lib/admin/queries";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsersAdmin(100);

  return (
    <>
      <Header title="Admin · Users" description="Accounts and credit balances" />
      <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6">
        <BackLink />
        {users.length === 0 ? (
          <EmptyState title="No users yet" description="Accounts will appear here once people sign up." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-label">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Account</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Balance</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Reserved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.name || u.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{u.role}</td>
                      <td className="px-4 py-3">
                        <Badge tone={u.status === "active" ? "success" : "neutral"} className="capitalize">
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{(u.balance ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {(u.reserved ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/admin" className="inline-flex text-sm font-medium text-primary hover:underline">
      ← Admin home
    </Link>
  );
}
