import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Agent tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                <Row k="Total" v={usage.tasks.total} />
                <Row k="Completed" v={usage.tasks.completed} />
                <Row k="Failed" v={usage.tasks.failed} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Workflow executions</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                <Row k="Total" v={usage.executions.total} />
                <Row k="Succeeded" v={usage.executions.succeeded} />
                <Row k="Failed" v={usage.executions.failed} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Credits in circulation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {usage.credits.totalBalance.toLocaleString()}
              </span>{" "}
              total balance across {usage.credits.accounts} accounts
            </p>
          </CardContent>
        </Card>

        <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
          <AdminLink href="/admin/users">Users</AdminLink>
          <AdminLink href="/admin/usage">Usage</AdminLink>
          <AdminLink href="/admin/failures">Failures</AdminLink>
          <AdminLink href="/api/health">Health API</AdminLink>
        </nav>
      </div>
    </>
  );
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-md border border-border-strong bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
    >
      {children}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="text-label">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value.toLocaleString()}
      </div>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium tabular-nums text-foreground">{v.toLocaleString()}</dd>
    </div>
  );
}
