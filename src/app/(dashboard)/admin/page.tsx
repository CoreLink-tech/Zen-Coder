import Link from "next/link";
import { Header } from "@/components/layout/header";
import { requireAdmin } from "@/lib/admin/guard";
import { getPlatformCounts, getUsageOverview } from "@/lib/admin/queries";

export default async function AdminHomePage() {
  await requireAdmin();

  let counts = { users: 0, workflows: 0, tasks: 0 };
  let usage = {
    tasks: { total: 0, failed: 0, completed: 0 },
    executions: { total: 0, failed: 0, succeeded: 0 },
    credits: { totalBalance: 0, accounts: 0 },
  };

  try {
    const [c, u] = await Promise.all([getPlatformCounts(), getUsageOverview()]);
    counts = c;
    usage = u;
  } catch (e) {
    console.error("admin overview", e);
  }

  return (
    <>
      <Header
        title="Admin"
        description="Platform overview — restricted to admin role"
      />
      <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Users" value={counts.users} />
          <Stat label="Workflows" value={counts.workflows} />
          <Stat label="Tasks" value={counts.tasks} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Agent tasks</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <Row k="Total" v={usage.tasks.total} />
              <Row k="Completed" v={usage.tasks.completed} />
              <Row k="Failed" v={usage.tasks.failed} />
            </dl>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Workflow executions</h2>
            <dl className="mt-3 space-y-1 text-sm">
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
