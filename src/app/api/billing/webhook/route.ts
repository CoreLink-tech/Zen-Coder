/**
 * Stripe webhook endpoint — verify signature, then grant credits / update subs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe, getWebhookSecret, isStripeConfigured } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/webhooks";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getWebhookSecret()
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Invalid signature",
      },
      { status: 400 }
    );
  }

  try {
    const result = await handleStripeEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Handler failed",
      },
      { status: 500 }
    );
  }
}
