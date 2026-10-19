/**
 * Stripe webhook event handlers — credits only after verified events.
 */

import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { recordPurchase, IdempotentReplayError } from "@/lib/credits";
import { getPlan, getPack } from "./plans";

export async function handleStripeEvent(event: Stripe.Event): Promise<{
  handled: boolean;
  detail?: string;
}> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        event.id
      );
    case "invoice.paid":
      return handleInvoicePaid(event.data.object as Stripe.Invoice, event.id);
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return handleSubscriptionChange(
        event.data.object as Stripe.Subscription,
        event.type
      );
    default:
      return { handled: false, detail: `Ignored ${event.type}` };
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const userId = session.metadata?.userId;
  if (!userId) {
    return { handled: false, detail: "No userId in session metadata" };
  }

  const mode = session.mode;
  const planId = session.metadata?.planId;
  const packId = session.metadata?.packId;

  // One-time credit pack
  if (mode === "payment" && packId) {
    const pack = getPack(packId);
    if (!pack) return { handled: false, detail: `Unknown pack ${packId}` };

    try {
      await recordPurchase({
        userId,
        amount: pack.credits,
        operationId: `stripe:checkout:${session.id}`,
        reason: `Credit pack ${pack.name}`,
        metadata: {
          eventId,
          sessionId: session.id,
          packId,
        },
      });
    } catch (err) {
      if (err instanceof IdempotentReplayError) {
        return { handled: true, detail: "Already granted (idempotent)" };
      }
      throw err;
    }

    return { handled: true, detail: `Granted ${pack.credits} credits` };
  }

  // Subscription checkout
  if (mode === "subscription" && planId) {
    const plan = getPlan(planId);
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    await upsertSubscriptionRecord({
      userId,
      planId: planId as string,
      status: "active",
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: subId ?? null,
      stripePriceId: session.metadata?.priceId ?? null,
    });

    if (plan && plan.monthlyCredits > 0) {
      try {
        await recordPurchase({
          userId,
          amount: plan.monthlyCredits,
          operationId: `stripe:checkout:${session.id}`,
          reason: `${plan.name} subscription initial credits`,
          metadata: { eventId, sessionId: session.id, planId },
        });
      } catch (err) {
        if (!(err instanceof IdempotentReplayError)) throw err;
      }
    }

    return { handled: true, detail: `Subscription ${planId} activated` };
  }

  return { handled: false, detail: "Unhandled checkout mode" };
}

async function handleInvoicePaid(invoice: Stripe.Invoice, eventId: string) {
  const userId = invoice.metadata?.userId;
  // subscription renewals often carry subscription metadata
  const subId =
    typeof (invoice as { subscription?: string | { id: string } }).subscription ===
    "string"
      ? ((invoice as { subscription?: string }).subscription as string)
      : (invoice as { subscription?: { id: string } }).subscription?.id;

  let resolvedUserId = userId;
  let planId: string | undefined = invoice.metadata?.planId;

  if (subId) {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, subId),
    });
    if (sub) {
      resolvedUserId = sub.userId;
      planId = sub.planId;
    }
  }

  if (!resolvedUserId || !planId) {
    return { handled: false, detail: "Could not resolve user/plan for invoice" };
  }

  // Skip the first invoice if already granted via checkout (idempotent op id uses invoice id)
  const plan = getPlan(planId);
  if (!plan || plan.monthlyCredits <= 0) {
    return { handled: true, detail: "No monthly credits for plan" };
  }

  try {
    await recordPurchase({
      userId: resolvedUserId,
      amount: plan.monthlyCredits,
      operationId: `stripe:invoice:${invoice.id}`,
      reason: `${plan.name} renewal credits`,
      metadata: { eventId, invoiceId: invoice.id, planId },
    });
  } catch (err) {
    if (err instanceof IdempotentReplayError) {
      return { handled: true, detail: "Already granted (idempotent)" };
    }
    throw err;
  }

  return { handled: true, detail: `Renewal credits granted` };
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
  eventType: string
) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, sub.id),
  });

  if (!existing) {
    return { handled: false, detail: "Subscription not in DB" };
  }

  const statusMap: Record<string, string> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    incomplete: "incomplete",
    trialing: "trialing",
    unpaid: "unpaid",
  };

  const status = statusMap[sub.status] ?? "canceled";
  const periodEnd = (
    sub as { current_period_end?: number }
  ).current_period_end;

  await db
    .update(subscriptions)
    .set({
      status: status as "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "unpaid",
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existing.id));

  return { handled: true, detail: `${eventType} → ${status}` };
}

async function upsertSubscriptionRecord(data: {
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "unpaid";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
}) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, data.userId),
  });

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        planId: data.planId,
        status: data.status,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      userId: data.userId,
      planId: data.planId,
      status: data.status,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripePriceId: data.stripePriceId,
    });
  }
}
