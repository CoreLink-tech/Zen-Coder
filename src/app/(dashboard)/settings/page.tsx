import { Header } from "@/components/layout/header";
import { requireUser } from "@/lib/auth/session";
import { getCreditAccountForUser } from "@/lib/db/queries";

export default async function SettingsPage() {
  const user = await requireUser();
  const creditAccount = await getCreditAccountForUser(user.id);

  return (
    <>
      <Header
        title="Settings"
        description="Account, models, credits, and integrations"
      />
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <div className="grid max-w-2xl gap-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Account</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{user.name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="capitalize">{user.role}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{user.status}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Credits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared balance for Coding and Automation.
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Available</dt>
                <dd className="font-medium">
                  {creditAccount?.balance ?? 0} credits
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reserved</dt>
                <dd>{creditAccount?.reserved ?? 0} credits</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Full ledger and purchases arrive in Phase 8 / 13.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">AI Providers & Models</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              DeepSeek, Claude, and OpenAI adapters arrive in Phase 4.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">GitHub Integration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Repository connection and scoped access arrive in Phase 6.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
