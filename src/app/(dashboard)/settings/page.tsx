import { Header } from "@/components/layout/header";

export default function SettingsPage() {
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
            <p className="mt-1 text-sm text-muted-foreground">
              Authentication and profile management will be available after Phase
              3.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">AI Providers & Models</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              DeepSeek, Claude, and OpenAI adapters arrive in Phase 4.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Credits & Billing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared credit ledger and subscription plans arrive in Phases 8 and
              13.
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
