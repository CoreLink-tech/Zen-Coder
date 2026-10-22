"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  enableWorkflowWebhook,
  disableWorkflowWebhook,
} from "@/lib/automation/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>Inbound webhook</CardTitle>
        <CardDescription>
          POST to trigger a run. Send header{" "}
          <code className="font-mono text-xs">X-Zen-Webhook-Secret</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="break-all rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
          /api/webhooks/workflows/{workflowId}
        </p>

        {secret && (
          <p role="status" className="break-all rounded-md border border-warning/30 bg-warning-soft px-3 py-2 font-mono text-xs text-foreground">
            Secret (shown once): {secret}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={handleEnable}>
            {hasSecret ? "Rotate secret" : "Enable webhook"}
          </Button>
          {hasSecret && (
            <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={handleDisable}>
              Disable
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
