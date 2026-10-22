import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin/guard";
import { listRecentFailures } from "@/lib/admin/queries";

export default async function AdminFailuresPage() {
  await requireAdmin();
  const { tasks, executions } = await listRecentFailures(30);

  return (
    <>
      <Header title="Admin · Failures" description="Recent failed tasks and workflow runs" />
      <div className="flex-1 space-y-8 overflow-auto p-4 sm:p-6">
        <Link href="/admin" className="inline-flex text-sm font-medium text-primary hover:underline">
          ← Admin home
        </Link>

        <section className="space-y-3">
          <h2 className="text-section text-foreground">Agent tasks</h2>
          {tasks.length === 0 ? (
            <EmptyState title="No failed tasks" description="Agent tasks that fail will be listed here." />
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {tasks.map((t) => (
                <div key={t.id} className="space-y-1 px-4 py-3 text-sm">
                  <div className="font-medium text-foreground">{t.title || t.id.slice(0, 8)}</div>
                  <div className="break-words text-xs text-destructive">{t.error || "Unknown error"}</div>
                  <div className="text-xs text-muted-foreground">
                    user {t.userId.slice(0, 8)}… · {t.workspace}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-section text-foreground">Workflow executions</h2>
          {executions.length === 0 ? (
            <EmptyState title="No failed executions" description="Workflow runs that fail will be listed here." />
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {executions.map((e) => (
                <div key={e.id} className="space-y-1 px-4 py-3 text-sm">
                  <div className="font-medium text-foreground">
                    {e.workflowId.slice(0, 8)}… · {e.trigger}
                  </div>
                  <div className="break-words text-xs text-destructive">{e.error || "Unknown error"}</div>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
