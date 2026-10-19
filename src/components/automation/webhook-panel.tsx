"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  enableWorkflowWebhook,
  disableWorkflowWebhook,
} from "@/lib/automation/actions";
import { Button } from "@/components/ui/button";

export function WebhookPanel({
  workflowId,
  hasSecret,
}: {
  workflowId: string;
  hasSecret: boolean;
}) {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleEnable() {
    setError(null);
    startTransition(async () => {
      const result = await enableWorkflowWebhook(workflowId);
      if (!result.success) {
        setError(result.error ?? "Failed");
        return;
      }
      setSecret(result.secret);
      router.refresh();
    });
  }

  function handleDisable() {
    startTransition(async () => {
      await disableWorkflowWebhook(workflowId);
      setSecret(null);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Inbound webhook</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        POST to trigger a run. Send header{" "}
        <code className="text-[10px]">X-Zen-Webhook-Secret</code>.
      </p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        /api/webhooks/workflows/{workflowId}
      </p>

      {secret && (
        <p className="mt-2 break-all rounded bg-muted/50 p-2 font-mono text-xs">
          Secret (shown once): {secret}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleEnable}
        >
          {hasSecret ? "Rotate secret" : "Enable webhook"}
        </Button>
        {hasSecret && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={handleDisable}
          >
            Disable
          </Button>
        )}
      </div>
    </section>
  );
}
