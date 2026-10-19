import Link from "next/link";
import { Header } from "@/components/layout/header";
import { requireAdmin } from "@/lib/admin/guard";
import { getPlatformCounts, getUsageOverview } from "@/lib/admin/queries";

export default async function AdminHomePage() {
  await requireAdmin();
  const [counts, usage] = await Promise.all([
    getPlatformCounts(),
    getUsageOverview(),
  ]);

  return (
    <>
      <Header
        title="Admin"
        description="Platform overview — restricted to admin role"
      />
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Users" value={counts.users} />
          <Stat label="Workflows" value={counts.workflows} />
          <Stat label="Agent tasks" value={counts.tasks} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Coding tasks</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row k="Total" v={usage.tasks.total} />
              <Row k="Completed" v={usage.tasks.completed} />
              <Row k="Failed" v={usage.tasks.failed} />
            </dl>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Workflow executions</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row k="Total" v={usage.executions.total} />
              <Row k="Succeeded" v={usage.executions.succeeded} />
              <Row k="Failed" v={usage.executions.failed} />
            </dl>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Credits in circulation</h2>
          <p className="mt-2 text-sm">
            {usage.credits.totalBalance.toLocaleString()} total balance across{" "}
            {usage.credits.accounts} accounts
          </p>
        </div>

        <nav className="flex flex-wrap gap-3 text-sm">
          <Link className="text-primary underline" href="/admin/users">
            Users
          </Link>
          <Link className="text-primary underline" href="/admin/usage">
            Usage
          </Link>
          <Link className="text-primary underline" href="/admin/failures">
            Failures
          </Link>
          <a className="text-primary underline" href="/api/health">
            Health API
          </a>
        </nav>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
