import Link from "next/link";
import { Header } from "@/components/layout/header";
import { requireAdmin } from "@/lib/admin/guard";
import { getUsageOverview } from "@/lib/admin/queries";

export default async function AdminUsagePage() {
  await requireAdmin();
  const usage = await getUsageOverview();

  return (
    <>
      <Header title="Admin · Usage" description="Recent credit usage entries" />
      <div className="flex-1 overflow-auto p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href="/admin" className="text-primary underline">
            ← Admin home
          </Link>
        </p>
        <ul className="space-y-2 text-sm">
          {usage.recentUsage.length === 0 ? (
            <li className="text-muted-foreground">No usage entries yet</li>
          ) : (
            usage.recentUsage.map((e) => (
              <li
                key={e.id}
                className="flex justify-between gap-4 rounded-md border border-border px-3 py-2"
              >
                <span className="truncate text-muted-foreground">
                  {e.userId.slice(0, 8)}… · {e.model || e.provider || "—"} ·{" "}
                  {e.reason || e.type}
                </span>
                <span className="shrink-0 text-destructive">
                  {e.amount.toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
