import { Header } from "@/components/layout/header";
import { requireUser } from "@/lib/auth/session";
import { getGitHubStatus } from "@/lib/github/actions";
import { GitHubSettings } from "@/components/github/github-settings";
import { listConfiguredProviders, MODEL_REGISTRY } from "@/lib/ai";
import {
  getAccountSummary,
  listLedgerEntries,
  CREDIT_CONFIG,
} from "@/lib/credits";

export default async function SettingsPage() {
  const user = await requireUser();
  const [summary, entries, github] = await Promise.all([
    getAccountSummary(user.id),
    listLedgerEntries(user.id, 15),
    getGitHubStatus(),
  ]);

  const configuredProviders = listConfiguredProviders();

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
              One shared balance for Coding and Automation. Rate:{" "}
              {CREDIT_CONFIG.creditsPerUsd.toLocaleString()} credits = $1.00
              provider cost ({CREDIT_CONFIG.version}).
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Available</dt>
                <dd className="font-medium">
                  {summary.available.toLocaleString()} credits
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Balance</dt>
                <dd>{summary.balance.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reserved</dt>
                <dd>{summary.reserved.toLocaleString()}</dd>
              </div>
            </dl>

            {entries.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent activity
                </h3>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                  {entries.map((e) => (
                    <li
                      key={e.id}
                      className="flex justify-between gap-2 border-b border-border/50 py-1.5"
                    >
                      <span className="truncate text-muted-foreground">
                        {e.type}
                        {e.reason ? ` · ${e.reason}` : ""}
                        {e.model ? ` · ${e.model}` : ""}
                      </span>
                      <span
                        className={
                          e.amount >= 0 ? "text-success" : "text-destructive"
                        }
                      >
                        {e.amount >= 0 ? "+" : ""}
                        {e.amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">AI Providers & Models</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform-managed keys. Configured providers:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {configuredProviders.length === 0 ? (
                <li className="text-muted-foreground">
                  None configured — set API keys in environment
                </li>
              ) : (
                configuredProviders.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.displayName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {p.listModels().length} models
                    </span>
                  </li>
                ))
              )}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Default model: {MODEL_REGISTRY[0]?.id ?? "—"}
            </p>
          </section>

          <GitHubSettings
            configured={github.configured}
            installUrl={github.installUrl}
            installations={github.installations}
            repositories={github.repositories}
          />
        </div>
      </div>
    </>
  );
}
