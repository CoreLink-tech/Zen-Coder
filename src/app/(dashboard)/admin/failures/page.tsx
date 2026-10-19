import Link from "next/link";
import { Header } from "@/components/layout/header";
import { requireAdmin } from "@/lib/admin/guard";
import { listRecentFailures } from "@/lib/admin/queries";

export default async function AdminFailuresPage() {
  await requireAdmin();
  const { tasks, executions } = await listRecentFailures(30);

  return (
    <>
      <Header
        title="Admin · Failures"
        description="Recent failed tasks and workflow runs"
      />
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/admin" className="text-primary underline">
            ← Admin home
          </Link>
        </p>

        <section>
          <h2 className="text-sm font-semibold">Agent tasks</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {tasks.length === 0 ? (
              <li className="text-muted-foreground">No failed tasks</li>
            ) : (
              tasks.map((t) => (
                <li
                  key={t.id}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <div className="font-medium">{t.title || t.id.slice(0, 8)}</div>
                  <div className="text-xs text-destructive">
                    {t.error || "Unknown error"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    user {t.userId.slice(0, 8)}… · {t.workspace}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold">Workflow executions</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {executions.length === 0 ? (
              <li className="text-muted-foreground">No failed executions</li>
            ) : (
              executions.map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <div className="font-medium">
                    {e.workflowId.slice(0, 8)}… · {e.trigger}
                  </div>
                  <div className="text-xs text-destructive">
                    {e.error || "Unknown error"}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
