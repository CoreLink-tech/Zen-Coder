/**
 * Create a Stripe Checkout session for a plan or credit pack.
 * Body: { kind: "plan" | "pack", id: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getStripe,
  getAppUrl,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import {
  getStripePriceId,
  getPackStripePriceId,
  getPlan,
  getPack,
} from "@/lib/billing/plans";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  let body: { kind?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = body.kind;
  const id = body.id;
  if (!kind || !id) {
    return NextResponse.json({ error: "kind and id required" }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  try {
    if (kind === "plan") {
      const plan = getPlan(id);
      const priceId = getStripePriceId(id);
      if (!plan || plan.id === "free" || !priceId) {
        return NextResponse.json(
          { error: "Plan unavailable or price not configured" },
          { status: 400 }
        );
      }

      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: session.user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings?billing=success`,
        cancel_url: `${appUrl}/settings?billing=canceled`,
        metadata: {
          userId: session.user.id,
          planId: plan.id,
          priceId,
        },
        subscription_data: {
          metadata: {
            userId: session.user.id,
            planId: plan.id,
          },
        },
      });

      return NextResponse.json({ url: checkout.url });
    }

    if (kind === "pack") {
      const pack = getPack(id);
      const priceId = getPackStripePriceId(id);
      if (!pack || !priceId) {
        return NextResponse.json(
          { error: "Pack unavailable or price not configured" },
          { status: 400 }
        );
      }

      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: session.user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings?billing=success`,
        cancel_url: `${appUrl}/settings?billing=canceled`,
        metadata: {
          userId: session.user.id,
          packId: pack.id,
          priceId,
        },
      });

      return NextResponse.json({ url: checkout.url });
    }

    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Checkout failed",
      },
      { status: 500 }
    );
  }
}
