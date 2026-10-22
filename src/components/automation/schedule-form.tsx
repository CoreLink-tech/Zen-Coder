"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertSchedule,
  disableSchedule,
} from "@/lib/automation/schedule-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

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
    <Card>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
        <CardDescription>
        Interval (minutes) or 5-field cron (UTC). Runs via{" "}
        <code className="font-mono text-xs">/api/cron/process-jobs</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="schedule-type">Type</Label>
            <select
              id="schedule-type"
              value={type}
              onChange={(e) =>
                setType(e.target.value as "interval" | "cron")
              }
              className="field"
            >
              <option value="interval">Interval (minutes)</option>
              <option value="cron">Cron (UTC)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schedule-expression">Expression</Label>
            <Input
              id="schedule-expression"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="font-mono"
              placeholder={type === "interval" ? "15" : "0 * * * *"}
            />
          </div>
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
          <p role="alert" className="rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {message && <p role="status" className="rounded-md border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">{message}</p>}

        <div className="flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
  );
}
