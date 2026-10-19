"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertSchedule,
  disableSchedule,
} from "@/lib/automation/schedule-actions";
import { Button } from "@/components/ui/button";

interface ScheduleInfo {
  id: string;
  type: string;
  expression: string;
  enabled: boolean | null;
  nextRunAt: Date | number | null;
  lastRunAt: Date | number | null;
}

export function ScheduleForm({
  workflowId,
  schedule,
}: {
  workflowId: string;
  schedule: ScheduleInfo | null;
}) {
  const router = useRouter();
  const [type, setType] = useState<"interval" | "cron">(
    (schedule?.type as "interval" | "cron") || "interval"
  );
  const [expression, setExpression] = useState(
    schedule?.expression || "15"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await upsertSchedule({
        workflowId,
        type,
        expression,
        enabled: true,
      });
      if (!result.success) {
        setError(result.error ?? "Failed");
        return;
      }
      setMessage(`Scheduled. Next run: ${result.nextRunAt}`);
      router.refresh();
    });
  }

  function handleDisable() {
    startTransition(async () => {
      await disableSchedule(workflowId);
      setMessage("Schedule disabled");
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Schedule</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Interval (minutes) or 5-field cron (UTC). Runs via{" "}
        <code className="text-[10px]">/api/cron/process-jobs</code>.
      </p>

      <form onSubmit={handleSave} className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="text-muted-foreground">Type</span>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "interval" | "cron")
              }
              className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="interval">Interval (minutes)</option>
              <option value="cron">Cron (UTC)</option>
            </select>
          </label>
          <label className="flex-1 text-sm">
            <span className="text-muted-foreground">Expression</span>
            <input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="ml-2 w-full max-w-xs rounded-md border border-border bg-background px-2 py-1 font-mono text-sm"
              placeholder={type === "interval" ? "15" : "0 * * * *"}
            />
          </label>
        </div>

        {schedule && (
          <p className="text-xs text-muted-foreground">
            {schedule.enabled ? "Enabled" : "Disabled"}
            {schedule.nextRunAt
              ? ` · next ${new Date(schedule.nextRunAt).toISOString()}`
              : ""}
            {schedule.lastRunAt
              ? ` · last ${new Date(schedule.lastRunAt).toISOString()}`
              : ""}
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && <p className="text-sm text-success">{message}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save schedule"}
          </Button>
          {schedule?.enabled && (
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
      </form>
    </section>
  );
}
