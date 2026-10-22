"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyCredits: number;
  features: string[];
}

interface Pack {
  id: string;
  name: string;
  credits: number;
}

export function PlansPanel({
  plans,
  packs,
  currentPlanId,
  stripeConfigured,
}: {
  plans: Plan[];
  packs: Pack[];
  currentPlanId: string;
  stripeConfigured: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(kind: "plan" | "pack", id: string) {
    setError(null);
    setLoading(`${kind}:${id}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Plans & credits</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Credits are granted only after verified Stripe payment events — never
        from the browser alone.
      </p>

      {!stripeConfigured && (
        <p className="mt-3 text-sm text-muted-foreground">
          Stripe is not configured. Set{" "}
          <code className="text-xs">STRIPE_SECRET_KEY</code>, webhook secret, and
          price IDs to enable checkout.
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col rounded-md border border-border p-3"
          >
            <div className="font-medium">{plan.name}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.description}
            </p>
            {plan.monthlyCredits > 0 && (
              <p className="mt-2 text-xs">
                {plan.monthlyCredits.toLocaleString()} credits / month
              </p>
            )}
            <ul className="mt-2 flex-1 space-y-1 text-xs text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            {plan.id === currentPlanId ? (
              <p className="mt-3 text-xs font-medium text-primary">Current plan</p>
            ) : plan.id === "free" ? (
              <p className="mt-3 text-xs text-muted-foreground">Default</p>
            ) : (
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={!stripeConfigured || loading !== null}
                onClick={() => checkout("plan", plan.id)}
              >
                {loading === `plan:${plan.id}` ? "…" : "Subscribe"}
              </Button>
            )}
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Credit packs
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {packs.map((pack) => (
          <Button
            key={pack.id}
            type="button"
            size="sm"
            variant="secondary"
            disabled={!stripeConfigured || loading !== null}
            onClick={() => checkout("pack", pack.id)}
          >
            {loading === `pack:${pack.id}` ? "…" : pack.name}
          </Button>
        ))}
      </div>
    </section>
  );
}
