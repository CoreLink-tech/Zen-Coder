"use client";

import { useState, useTransition } from "react";
import {
  approveArchitecturePlan,
  rejectArchitecturePlan,
} from "@/lib/architect/actions";
import { Button } from "@/components/ui/button";

export function ArchitecturePlanCard({
  planId,
  mode,
  content,
  status,
}: {
  planId: string;
  mode: string;
  content: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);

  let pretty = content;
  try {
    pretty = JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    /* keep raw */
  }

  function approve() {
    start(async () => {
      const r = await approveArchitecturePlan(planId);
      if (!r.success) setError(r.error ?? "Failed");
      else setLocalStatus("approved");
    });
  }

  function reject() {
    start(async () => {
      const r = await rejectArchitecturePlan(planId);
      if (!r.success) setError(r.error ?? "Failed");
      else setLocalStatus("rejected");
    });
  }

  return (
    <div className="mx-3 mb-3 rounded-lg border border-border bg-card p-3 sm:mx-4 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">System Architect</h3>
        <span className="text-xs capitalize text-muted-foreground">
          {mode} · {localStatus.replace("_", " ")}
        </span>
      </div>
      <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/50 p-2 text-xs leading-relaxed">
        {pretty}
      </pre>
      {localStatus === "pending_approval" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={approve}>
            Approve plan
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={reject}
          >
            Reject
          </Button>
        </div>
      )}
      {localStatus === "approved" && (
        <p className="mt-2 text-xs text-success">
          Plan approved. Send a follow-up message to continue implementation.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
