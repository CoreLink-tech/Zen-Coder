import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin/guard";
import { getUsageOverview } from "@/lib/admin/queries";

export default async function AdminUsagePage() {
  await requireAdmin();
  const usage = await getUsageOverview();

  return (
    <>
      <Header title="Admin · Usage" description="Recent credit usage entries" />
      <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6">
        <Link href="/admin" className="inline-flex text-sm font-medium text-primary hover:underline">
          ← Admin home
        </Link>
        {usage.recentUsage.length === 0 ? (
          <EmptyState title="No usage yet" description="Credit usage entries will show up here as people use the platform." />
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {usage.recentUsage.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {e.model || e.provider || "—"} · {e.reason || e.type}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{e.userId.slice(0, 8)}…</div>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-destructive">
                  {e.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
