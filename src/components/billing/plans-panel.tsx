"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>Plans and credits</CardTitle>
        <CardDescription>
          Credits are granted only after verified Stripe payment events — never
          from the browser alone.
        </CardDescription>
      </CardHeader>
      <CardContent>

      {!stripeConfigured && (
        <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Stripe is not configured. Set{" "}
          <code className="text-xs">STRIPE_SECRET_KEY</code>, webhook secret, and
          price IDs to enable checkout.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-lg border p-4 ${
              plan.id === currentPlanId
                ? "border-primary/40 bg-primary-soft/40"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-foreground">{plan.name}</div>
              {plan.id === currentPlanId && <Badge tone="primary">Current</Badge>}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {plan.description}
            </p>
            {plan.monthlyCredits > 0 && (
              <p className="mt-3 text-sm font-medium text-foreground">
                {plan.monthlyCredits.toLocaleString()} credits / month
              </p>
            )}
            <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            {plan.id === currentPlanId ? (
              <p className="mt-4 text-xs font-medium text-primary">Your current plan</p>
            ) : plan.id === "free" ? (
              <p className="mt-4 text-xs text-muted-foreground">Default</p>
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

      <h3 className="mb-2 mt-6 text-label">
        Credit packs
      </h3>
      <div className="flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
  );
}
