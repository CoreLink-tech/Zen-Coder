/**
 * Product plans and credit entitlements.
 * Map Stripe price IDs via environment variables.
 */

export interface PlanDefinition {
  id: "free" | "starter" | "pro";
  name: string;
  description: string;
  /** Monthly credit grant when subscription renews / purchases */
  monthlyCredits: number;
  /** One-time pack credits (if purchased as credit pack) */
  features: string[];
  /** Env var name holding Stripe price id */
  stripePriceEnv?: string;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    description: "Welcome credits and core features",
    monthlyCredits: 0,
    features: ["Coding agent", "Basic automation", "Community support"],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For individuals shipping regularly",
    monthlyCredits: 50_000,
    features: [
      "Everything in Free",
      "50,000 credits / month",
      "Scheduled workflows",
      "GitHub write (approved)",
    ],
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Higher limits for power users",
    monthlyCredits: 200_000,
    features: [
      "Everything in Starter",
      "200,000 credits / month",
      "Priority execution",
      "Inbound webhooks",
    ],
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
];

export function getPlan(planId: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === planId);
}

export function getStripePriceId(planId: string): string | null {
  const plan = getPlan(planId);
  if (!plan?.stripePriceEnv) return null;
  return process.env[plan.stripePriceEnv] ?? null;
}

/** Credit packs (one-time) */
export const CREDIT_PACKS = [
  {
    id: "pack_10k",
    name: "10,000 credits",
    credits: 10_000,
    stripePriceEnv: "STRIPE_PRICE_PACK_10K",
  },
  {
    id: "pack_50k",
    name: "50,000 credits",
    credits: 50_000,
    stripePriceEnv: "STRIPE_PRICE_PACK_50K",
  },
] as const;

export function getPack(packId: string) {
  return CREDIT_PACKS.find((p) => p.id === packId);
}

export function getPackStripePriceId(packId: string): string | null {
  const pack = getPack(packId);
  if (!pack) return null;
  return process.env[pack.stripePriceEnv] ?? null;
}
