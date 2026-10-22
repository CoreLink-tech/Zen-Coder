"use client";

import { useState, useTransition } from "react";
import {
  declineDebuggerAction,
  runDebuggerAction,
} from "@/lib/debugger/actions";
import { Button } from "@/components/ui/button";

export function DebuggerOfferCard({
  runId,
  message,
  assistantSummary,
}: {
  runId: string;
  message: string;
  assistantSummary: string;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<"declined" | "ran" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-3 mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:mx-4 sm:p-4">
      <h3 className="text-sm font-semibold">Multi-Model Debugger</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {!done && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await runDebuggerAction(runId, {
                  assistantSummary,
                });
                if (!r.success) {
                  setError(r.error ?? "Debugger failed");
                  return;
                }
                const findings = (r as { findings?: unknown }).findings;
                setDone("ran");
                setResult(
                  typeof findings === "string"
                    ? findings
                    : JSON.stringify(findings ?? null)
                );
              })
            }
          >
            Run Debugger
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await declineDebuggerAction(runId);
                setDone("declined");
              })
            }
          >
            Not Now
          </Button>
        </div>
      )}
      {done === "declined" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Debugger skipped — no extra model calls or charges.
        </p>
      )}
      {done === "ran" && result && (
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/50 p-2 text-xs">
          {result}
        </pre>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
