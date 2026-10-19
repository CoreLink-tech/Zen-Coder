import Link from "next/link";
import { Header } from "@/components/layout/header";
import { requireAdmin } from "@/lib/admin/guard";
import { listUsersAdmin } from "@/lib/admin/queries";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsersAdmin(100);

  return (
    <>
      <Header title="Admin · Users" description="Accounts and credit balances" />
      <div className="flex-1 overflow-auto p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href="/admin" className="text-primary underline">
            ← Admin home
          </Link>
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">Reserved</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.name || u.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2 capitalize">{u.status}</td>
                  <td className="px-3 py-2">
                    {(u.balance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {(u.reserved ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
