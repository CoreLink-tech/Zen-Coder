import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getGitHubStatus } from "@/lib/github/actions";
import { GitHubSettings } from "@/components/github/github-settings";
import { listConfiguredProviders, MODEL_REGISTRY } from "@/lib/ai";
import {
  getAccountSummary,
  listLedgerEntries,
  CREDIT_CONFIG,
} from "@/lib/credits";
import { PlansPanel } from "@/components/billing/plans-panel";
import { PLANS, CREDIT_PACKS } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage() {
  const user = await requireUser();

  let summary = { balance: 0, reserved: 0, available: 0, accountId: "" };
  let entries: Awaited<ReturnType<typeof listLedgerEntries>> = [];
  let github = {
    configured: false,
    installUrl: null as string | null,
    installations: [] as Awaited<ReturnType<typeof getGitHubStatus>>["installations"],
    repositories: [] as Awaited<ReturnType<typeof getGitHubStatus>>["repositories"],
  };
  let currentPlanId = "free";

  try {
    const [s, e, g, sub] = await Promise.all([
      getAccountSummary(user.id),
      listLedgerEntries(user.id, 15),
      getGitHubStatus().catch(() => github),
      db.query.subscriptions
        .findFirst({ where: eq(subscriptions.userId, user.id) })
        .catch(() => null),
    ]);
    summary = s;
    entries = e;
    github = g;
    currentPlanId = sub?.planId ?? "free";
  } catch (err) {
    console.error("settings load", err);
  }

  const configuredProviders = listConfiguredProviders();

  return (
    <>
      <Header
        title="Settings"
        description="Account, models, credits, and integrations"
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
        <div className="mx-auto grid w-full max-w-2xl gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
            <dl className="space-y-2.5 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="capitalize">{user.role}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{user.status}</dd>
              </div>
            </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
              <CardDescription>
                Shared balance for Coding and Automation (
                {CREDIT_CONFIG.creditsPerUsd} credits / USD).
              </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-label">Balance</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {summary.balance.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-label">Reserved</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {summary.reserved.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-label">Available</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {summary.available.toLocaleString()}
                </div>
              </div>
            </div>
            {entries.length > 0 && (
              <div className="mt-5">
                <h3 className="text-label">
                  Recent activity
                </h3>
                <ul className="mt-2 max-h-48 divide-y divide-border overflow-y-auto text-sm">
                  {entries.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {e.type}
                        {e.reason ? ` · ${e.reason}` : ""}
                        {e.model ? ` · ${e.model}` : ""}
                      </span>
                      <span
                        className={
                          `font-medium tabular-nums ${e.amount >= 0 ? "text-success" : "text-destructive"}`
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI providers and models</CardTitle>
              <CardDescription>
                Platform-managed keys. Configured providers:
              </CardDescription>
            </CardHeader>
            <CardContent>
            <ul className="space-y-1.5 text-sm">
              {configuredProviders.length === 0 ? (
                <li className="text-muted-foreground">
                  None configured — set API keys in Vercel env
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
            <p className="mt-3 text-xs text-muted-foreground">
              Default model: {MODEL_REGISTRY[0]?.id ?? "—"}
            </p>
            </CardContent>
          </Card>

          <PlansPanel
            plans={PLANS.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              monthlyCredits: p.monthlyCredits,
              features: p.features,
            }))}
            packs={CREDIT_PACKS.map((p) => ({
              id: p.id,
              name: p.name,
              credits: p.credits,
            }))}
            currentPlanId={currentPlanId}
            stripeConfigured={isStripeConfigured()}
          />

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
